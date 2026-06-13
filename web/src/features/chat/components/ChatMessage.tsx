"use client";

import { FC } from "react";
import { ChatMarkdown } from "./ChatMarkdown";

import { ChatMessageProps } from "../types/components/ChatMessage.types";

export const ChatMessage: FC<ChatMessageProps> = ({ message }) => {
    const isUser = message.role === "user";
    const time = new Date(message.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    if (isUser) {
        return (
            <div className="flex flex-col items-end w-full mb-0">
                <div className="self-end max-w-[85%] rounded-2xl bg-chat-user-bg px-3.5 py-2 text-sm text-chat-user-fg">
                    <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                <span className="text-[10px] text-muted-foreground px-1 opacity-0 hover:opacity-100 transition-opacity cursor-default">
                    {time}
                </span>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-start w-full space-y-2">
            <div className="w-full text-sm text-chat-assistant-fg py-1">
                <ChatMarkdown content={message.content} />
            </div>
        </div>
    );
};
