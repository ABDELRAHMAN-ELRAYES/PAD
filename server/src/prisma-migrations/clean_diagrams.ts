import PrismaClientSingleton from "../data-server-clients/prisma-client";

async function main() {
    const prisma = PrismaClientSingleton.getPrismaClient();
    console.log("Starting diagram cleanup...");

    const diagrams = await prisma.diagram.findMany();
    console.log(`Found ${diagrams.length} diagrams to check.`);

    let updatedCount = 0;

    for (const diagram of diagrams) {
        const code = diagram.mermaidCode.trim();
        if (code.startsWith("{") && code.endsWith("}")) {
            try {
                const parsed = JSON.parse(code);
                if (parsed.tier1 || parsed.tier2 || parsed.tier3) {
                    console.log(`Cleaning up diagram ID ${diagram.id} (${diagram.title})`);
                    
                    await prisma.diagram.update({
                        where: { id: diagram.id },
                        data: {
                            tier1Code: parsed.tier1 || null,
                            tier2Code: parsed.tier2 || null,
                            tier3Code: parsed.tier3 || null,
                            activeTier: 2,
                            mermaidCode: parsed.tier2 || diagram.mermaidCode,
                        },
                    });
                    updatedCount++;
                }
            } catch (err) {
                console.error(`Failed to parse JSON for diagram ID ${diagram.id}:`, err);
            }
        }
    }

    console.log(`Cleanup finished. Updated ${updatedCount} diagrams.`);
}

main()
    .catch((e) => {
        console.error("Migration script failed:", e);
        process.exit(1);
    })
    .finally(() => {
        process.exit(0);
    });
