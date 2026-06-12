import { NextFunction } from "express";
import {
    IUserLoginData,
    IRegisterVerificationData,
    IRegisterData,
    IResetPasswordData,
} from "./types/IAuth";
import UserService from "../user/user.service";
import { hash, compare } from "../../utils/hashing-handler";
import AppError from "../../utils/app-error";
import {
    signJWT,
    signPasswordResetJWT,
    verifyPasswordResetJWT,
} from "../../utils/jwt";
import EmailQueue from "../../utils/email/email-queue";
import { generateOTP } from "../../utils/otp-generator";
import config from "../../config/config";
import { IUser } from "../user/types/IUser";

class AuthenticationService {
    static async login(
        userData: IUserLoginData,
        next: NextFunction
    ) {
        const { usernameOrEmail, password } = userData;
        // Check if the provided usernmae or email is fourn
        const user = await UserService.getUserByUsernameOrEmail(
            usernameOrEmail,
            next
        );
        if (!user?.active) {
            return next(new AppError(401, "غير مصرح به، حسابك معطل."));
        }

        if (!user || !user.password) return;

        // Check if the provided password is correct
        const verifyPassword = await compare(password, user.password);
        if (!verifyPassword) {
            next(
                new AppError(
                    401,
                    `المستخدم المقدم: ${usernameOrEmail} أو كلمة المرور غير صحيحة، حاول مرة أخرى!`
                )
            );
            return;
        }
        // Create jwt token
        const token = signJWT(user.id);

        const data = { user, token };

        return data;
    }
    // Verify User before signing up his information
    static async register(
        registerData: IRegisterVerificationData,
        next: NextFunction
    ) {
        // extract email
        const { email } = registerData;

        // Check if the provided email is existed
        const userExists = await UserService.isUserEmailExisted(email, next);
        if (userExists && userExists.status === "fail") return;

        // Cash user data and OTP
        const otp = generateOTP();
        const hashedOTP = await hash(otp);
        const otpExpiresIn = new Date(
            Date.now() + config.otp.expiresIn * 60 * 1000
        ).toISOString();

        // send verification email
        const emailSender: string = config.mail.defaultFrom as string;
        const templateData = {
            otp,
            email,
            otpExpiresIn,
        };

        EmailQueue.enqueue({
            to: email,
            from: emailSender,
            emailType: "signup-verification",
            subject: "عملية التحقق من التسجيل",
            templateData
        });

        return {
            email,
            otp: { code: hashedOTP, expiresIn: otpExpiresIn },
        };
    }
    static async registerVerification(
        verificationProcessData: IRegisterData,
        next: NextFunction
    ) {
        const {
            otp: { hashedOtp, expiresIn, enteredOtp },
            user: { firstName, lastName, email, password, phone, role },
        } = verificationProcessData;
        // check if the register time expired
        const isExpired = Date.now() > Date.parse(expiresIn);
        if (isExpired) {
            return next(
                new AppError(401, "انتهت الفترة المسموحة للتسجيل, سجل مرة اخري")
            );
        }

        // Verfiy the hashed OTP with the entered one

        const isVerified = await compare(enteredOtp, hashedOtp);
        if (!isVerified) {
            return next(new AppError(402, "كود التحقق المدخل غير صحيح"));
        }

        const newUserData = {
            email,
            phone,
            firstName,
            lastName,
            password,
            role,
        };
        const newUser = await UserService.saveUser(newUserData, next);
        // Create jwt token
        const token = signJWT(newUser?.id as string);

        const data = { user: newUser, token, isVerified: true };
        // send Welcome EmailgenerateRedisKey
        const emailSender: string = config.mail.defaultFrom as string;
        const templateData = {
            name: newUser?.firstName,
            email: newUser?.email,
        };
        EmailQueue.enqueue({
            to: newUserData.email,
            from: emailSender,
            emailType: "welcome",
            subject: "مرحباً بك في Operest",
            templateData
        });
        // Delete cashed data
        return data;
    }

    // Send Forget password email
    static async forgetPassword(email: string, next: NextFunction) {
        if (!email) {
            next(new AppError(400, "البريد الإلكتروني مطلوب"));
            return;
        }

        // Check if the user exists
        const user = await UserService.getUserByUsernameOrEmail(email, next);
        if (!user) {
            next(new AppError(401, "البريد الإلكتروني غير موجود!"));
            return;
        }

        const resetToken = signPasswordResetJWT(user.email);

        const resetLink = `https://lynkr.com/reset-password?token=${encodeURIComponent(
            resetToken
        )}`;

        const defaultFrom = config.mail.defaultFrom as string;
        const templateData = {
            name: user.firstName,
            resetLink,
            expirationTime: config.jwt.resetPasswordExpiresIn,
            email: user.email,
        };

        // Dev mode logging to help local testing without SMTP configuration
        console.log(`\n==========================================`);
        console.log(`[AUTH] DEVELOPMENT PASSWORD RESET LINK for ${user.email}: ${resetLink}`);
        console.log(`==========================================\n`);

        EmailQueue.enqueue({
            to: user.email,
            from: defaultFrom,
            emailType: "forget-password",
            subject: "إعادة تعيين كلمة المرور",
            templateData
        });

        let expiresIn = config.jwt.resetPasswordExpiresIn;
        return { email: user.email, expiresIn };
    }

    // Reset user password
    static async resetPassword(
        resetPasswordData: IResetPasswordData,
        next: NextFunction
    ) {
        const { token, password } = resetPasswordData;

        if (!token) {
            next(new AppError(400, "رمز إعادة التعيين مطلوب"));
            return;
        }

        let decoded: any;

        try {
            decoded = verifyPasswordResetJWT(token);
        } catch (err) {
            return next(
                new AppError(401, "رمز إعادة التعيين غير صالح أو منتهي الصلاحية")
            );
        }

        const email = decoded.email;

        const expiresIn = decoded.expiresIn;

        const isExpired = Date.now() > Date.parse(expiresIn);
        if (isExpired) {
            next(
                new AppError(
                    401,
                    "كلمة المرور الجديدة مطلوبة، يرجى التحقق والمحاولة مرة أخرى!"
                )
            );
            return;
        }

        if (!password) {
            next(
                new AppError(
                    400,
                    "كلمة المرور الجديدة مطلوبة، يرجى التحقق والمحاولة مرة أخرى!"
                )
            );
            return;
        }

        // Update user with the new password
        const hashedPassword = await hash(password);
        const user = await UserService.updateUserPasswordByEmail(
            email,
            hashedPassword
        );
        if (!user) {
            next(new AppError(500, "عذراً، حدث خطأ أثناء إعادة تعيين كلمة المرور!"));
            return;
        }

        // Send Reset Email performed successfully mail
        const defaultFrom = config.mail.defaultFrom as string;
        const templateData = {
            name: user.firstName,
            email: user.email,
        };
        EmailQueue.enqueue({
            to: email,
            from: defaultFrom,
            emailType: "reset-password",
            subject: "تم إعادة تعيين كلمة المرور بنجاح",
            templateData
        });
        return user;
    }

    static async logout() {
        return;
    }

    // * Get current user session data
    static async getCurrentUserData(user: IUser, next: NextFunction) {
        if (!user) {
            return next(new AppError(401, "غير مصرح"));
        }
        const currentUser = await UserService.getUserByUsernameOrEmail(
            user.email,
            next
        );
        // const convertedUser = convertToUserResponse(request.user as IUser);
        if (!currentUser) {
            return next(new AppError(401, "غير مصرح لك"));
        }
        return currentUser;
    }
}

export default AuthenticationService;
