import PrismaClientSingleton from "./data-server-clients/prisma-client";

async function main() {
    const prisma = PrismaClientSingleton.getPrismaClient();
    const sessions = await prisma.iterationSession.findMany({
        include: {
            idea: { select: { refinedText: true } },
            _count: { select: { messages: true } }
        },
        orderBy: { createdAt: "asc" }
    });

    console.log("=== ALL SESSIONS (OLD TO NEW) ===");
    for (const s of sessions) {
        console.log(`ID: ${s.id}`);
        console.log(`Idea ID: ${s.ideaId}`);
        console.log(`Created: ${s.createdAt.toISOString()}`);
        console.log(`Messages Count: ${s._count.messages}`);
        console.log(`Idea Text Preview: ${s.idea?.refinedText?.substring(0, 100) || "No text"}`);
        console.log("--------------------------------------");
    }
}

main().catch(console.error);
