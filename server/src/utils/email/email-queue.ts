import Email from "./email";

export interface EmailJob {
    to: string;
    from: string;
    emailType: string;
    subject: string;
    templateData: any;
    retries?: number;
}

class EmailQueue {
    private static instance: EmailQueue;
    private queue: EmailJob[] = [];
    private processing = false;
    private maxRetries = 3;

    private constructor() {}

    public static getInstance(): EmailQueue {
        if (!EmailQueue.instance) {
            EmailQueue.instance = new EmailQueue();
        }
        return EmailQueue.instance;
    }

    /**
     * Enqueue a new email job to be sent in the background
     */
    public enqueue(job: Omit<EmailJob, "retries">): void {
        const fullJob: EmailJob = { ...job, retries: 0 };
        this.queue.push(fullJob);
        console.log(`[EmailQueue] Enqueued email job to: ${job.to}, subject: ${job.subject}`);
        this.processQueue();
    }

    /**
     * Internal runner to process queue items sequentially
     */
    private async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        this.processing = true;
        const job = this.queue.shift();

        if (job) {
            try {
                await this.sendEmail(job);
                console.log(`[EmailQueue] Successfully sent email to: ${job.to}`);
            } catch (error: any) {
                console.error(`[EmailQueue] Error sending email to: ${job.to}. Error: ${error?.message || error}`);
                
                if (job.retries! < this.maxRetries) {
                    job.retries! += 1;
                    console.log(`[EmailQueue] Retrying job (attempt ${job.retries}/${this.maxRetries}) in 5 seconds...`);
                    // Put back to the front of queue or end of queue? End is safer to prevent blocking other emails.
                    this.queue.push(job);
                    
                    // Delay retry
                    await new Promise(resolve => setTimeout(resolve, 5000));
                } else {
                    console.error(`[EmailQueue] Job failed permanently after ${this.maxRetries} retries.`);
                }
            }
        }

        this.processing = false;
        // Process next item
        this.processQueue();
    }

    /**
     * Wraps the email sender logic
     */
    private async sendEmail(job: EmailJob): Promise<void> {
        const emailObj = new Email(job.from, job.to);
        await emailObj.send(job.emailType, job.subject, job.templateData);
    }
}

export default EmailQueue.getInstance();
