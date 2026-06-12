import { UserRole } from "../../enum/UserRole";
import { catchAsync } from "../../utils/catch-async";
import { UpdateUserRequest } from "./types/IUser";
import UserService from "./user.service";
import { Request, Response, NextFunction } from "express";

/*
 * Create a new user based on user-type
 */
export const saveUser = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const { firstName, lastName, email, password, phone, role, privileges } =
            request.body;
        const userData = {
            email,
            password,
            firstName,
            lastName,
            phone,
            role,
            privileges,
        };
        const user = await UserService.saveUser(userData, next);
        if (!user) return;
        response.status(201).json({ status: "success", data: { user } });
    }
);

/*
 * Update a user by his id and new provided data
 */
export const updateUser = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const userId = request.params.id;
        const updatedData: UpdateUserRequest = {
            ...request.body.data,
            id: userId,
        };
        const user = await UserService.updateUser(updatedData, next);
        if (!user) return;
        response.status(200).json({ status: "success", data: { user } });
    }
);

/*
 * Delete a user by his id
 */
export const deleteUser = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const userId = request.params.id as string;
        const user = await UserService.deleteUser(userId, next);
        if (!user) return;
        response.status(200).json({ status: "success", data: { user } });
    }
);

/*
 * get all users
 */
export const getAllUsers = catchAsync(
    async (request: Request, response: Response, _next: NextFunction) => {
        const role: UserRole = request.query.role as UserRole;
        const users = await UserService.getAllUsers(role);
        if (!users.length) return;
        response
            .status(200)
            .json({ status: "success", data: { length: users.length, users } });
    }
);

/*
 * get user by his id
 */
export const getUser = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const userId = request.params.id as string;
        const user = await UserService.getUser(userId, next);
        if (!user) return;
        response.status(200).json({ status: "success", data: { user } });
    }
);

// update User status
export const updateUserStatus = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const userId = request.params.id as string;
        const active: boolean = request.body.active;
        const user = await UserService.updateUserStatus(userId, active, next);
        if (!user) return;
        response.status(200).json({
            status: "success",
            message: "User status updated successfully",
        });
    }
);

// Update the user password
export const updateUserPassword = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const userId = request.params.id as string;
        const password: string = request.body.password;
        const user = await UserService.updateUserPassword(userId, password, next);
        if (!user) return;
        response.status(200).json({
            status: "success",
            message: "User password updated successfully",
        });
    }
);

export const updateUserProfilePassword = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const userId = request.params.id as string;
        const { currentPassword, newPassword } = request.body as {
            currentPassword: string;
            newPassword: string;
        };

        const user = await UserService.updateUserProfilePassword(
            userId,
            currentPassword,
            newPassword,
            next
        );
        if (!user) return;
        response.status(200).json({
            status: "success",
            message: "Password changed successfully",
        });
    }
);

// Create batch users
export const createBatchUsers = catchAsync(
    async (request: Request, response: Response, _next: NextFunction) => {
        const users = request.body.users;
        const newUsers = await UserService.createBatchUsers(users);
        response.status(200).json({
            status: "success",
            data: {
                length: newUsers.count,
                users: newUsers,
            },
        });
    }
);

// get batch of users
export const getBatchUsers = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const {
            page = "1",
            limit = "10",
            search,
            role,
            status,
        } = request.query as Record<string, string>;

        if (!request.user) {
            return next(new Error("You are not authenticated"));
        }

        const result = await UserService.getBatchUsers(
            {
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                search,
                role: role as UserRole,
                status:
                    status && status === "active"
                        ? true
                        : status && status === "inactive"
                            ? false
                            : undefined,
            },
            request.user.email,
            next
        );

        if (!result) return;

        response.status(200).json({
            status: "success",
            data: result,
        });
    }
);

export const getMinBatchUsers = catchAsync(
    async (request: Request, response: Response, _next: NextFunction) => {
        const { role = "USER" } = request.query as Record<string, string>;

        const result = await UserService.getMinBatchUsers(role);

        response.status(200).json({
            status: "success",
            data: result,
        });
    }
);

// * Get users statistics
export const getUsersStatistics = catchAsync(
    async (_request: Request, response: Response, _next: NextFunction) => {
        const users = await UserService.getUsersStatistics();

        response.status(200).json({
            status: "success",
            data: users,
        });
    }
);

export const updateUserProfile = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
        const userId = request.params.id as string;
        const updatedData: UpdateUserRequest & {
            hasNewAvatar: string;
            avatar?: string;
        } = {
            ...request.body,
            id: userId,
        };
        const user = await UserService.updateUserProfile(
            updatedData,
            request.file?.filename,
            next
        );

        response.status(200).json({
            status: "success",
            data: { user },
        });
    }
);
