import * as fs from "fs";
import * as path from "path";
import { ZipArchive } from "archiver";

export interface IZipArtifact {
    filePath: string; // e.g. "specifications/api-specification.md"
    content: string;
}

const ZIP_DIR = "/tmp/handoffs";

export async function buildHandoffZip(
    ideaId: string,
    version: number,
    artifacts: IZipArtifact[]
): Promise<string> {
    // Ensure output dir exists
    if (!fs.existsSync(ZIP_DIR)) {
        fs.mkdirSync(ZIP_DIR, { recursive: true });
    }

    const zipFileName = `handoff-${ideaId}-v${version}.zip`;
    const zipFilePath = path.join(ZIP_DIR, zipFileName);

    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipFilePath);
        const archive = new ZipArchive({ zlib: { level: 9 } });

        output.on("close", () => resolve(zipFilePath));
        archive.on("error", (err) => reject(err));

        archive.pipe(output);

        // Write each artifact into the ZIP under handoff-package/
        for (const artifact of artifacts) {
            archive.append(artifact.content, {
                name: path.join("handoff-package", artifact.filePath),
            });
        }

        // Add metadata.json
        const metadata = {
            ideaId,
            version,
            generatedAt: new Date().toISOString(),
            artifactCount: artifacts.length,
        };
        archive.append(JSON.stringify(metadata, null, 2), {
            name: "handoff-package/metadata.json",
        });

        archive.finalize();
    });
}
