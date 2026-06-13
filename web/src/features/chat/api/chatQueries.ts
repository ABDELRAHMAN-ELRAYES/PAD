import { iterationApi } from "./chat.api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const useIterationSession = (ideaId?: string) => {
  return useQuery({
    queryKey: ["chat", "session", ideaId],
    queryFn: () => iterationApi.getSession(ideaId!),
    enabled: !!ideaId,
  });
};

export const useSendIterationMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ideaId, content }: { ideaId: string; content: string }) =>
      iterationApi.sendMessage(ideaId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["chat", "session", variables.ideaId] });
      toast.success("Message sent");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to send message");
    },
  });
};


