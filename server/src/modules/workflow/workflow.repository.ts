import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import {
  IWorkflow,
  IWorkflowStep,
  IWorkflowStepDependency,
  IWorkflowStepVersion,
  WorkflowStatus,
  WorkflowStepStatus,
  IHandoffPackage,
  IHandoffArtifact,
  HandoffPackageStatus,
  HandoffArtifactFileType,
} from "./types/IWorkflow";

@Injectable()
export class WorkflowRepository {
  private static instance: WorkflowRepository;

  constructor(private readonly db: DatabaseService) {
    WorkflowRepository.instance = this;
  }

  static getInstance(): WorkflowRepository {
    return WorkflowRepository.instance;
  }

  private mapRowToWorkflow(row: any): IWorkflow {
    return {
      id: row.id,
      ideaId: row.idea_id,
      status: (row.status || "draft") as WorkflowStatus,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapRowToStep(row: any): IWorkflowStep {
    return {
      id: row.id,
      workflowId: row.workflow_id,
      title: row.title,
      description: row.description || "",
      instructions: row.instructions || "",
      status: (row.status || "pending") as WorkflowStepStatus,
      order: Number(row.step_order),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      dependencies: [],
      dependents: [],
      versions: [],
    };
  }

  async createWorkflow(ideaId: string): Promise<IWorkflow> {
    const sql = `
      INSERT INTO workflows (idea_id, status, created_at, updated_at)
      VALUES ($1, 'draft', NOW(), NOW())
      ON CONFLICT (idea_id) DO UPDATE
      SET status = 'draft', updated_at = NOW()
      RETURNING id, idea_id, status, created_at, updated_at;
    `;
    const row = await this.db.queryOne(sql, [ideaId]);
    return this.mapRowToWorkflow(row);
  }

  async getWorkflowByIdeaId(ideaId: string): Promise<IWorkflow | null> {
    const sql = `
      SELECT id, idea_id, status, created_at, updated_at
      FROM workflows
      WHERE idea_id = $1
      LIMIT 1;
    `;
    const row = await this.db.queryOne(sql, [ideaId]);
    if (!row) return null;

    const workflow = this.mapRowToWorkflow(row);
    workflow.steps = await this.getWorkflowStepsByWorkflowId(workflow.id);
    return workflow;
  }

  async getWorkflowById(id: string): Promise<IWorkflow | null> {
    const sql = `
      SELECT id, idea_id, status, created_at, updated_at
      FROM workflows
      WHERE id = $1
      LIMIT 1;
    `;
    const row = await this.db.queryOne(sql, [id]);
    if (!row) return null;

    const workflow = this.mapRowToWorkflow(row);
    workflow.steps = await this.getWorkflowStepsByWorkflowId(workflow.id);
    return workflow;
  }

  async updateWorkflowStatus(
    id: string,
    status: string,
  ): Promise<IWorkflow> {
    const sql = `
      UPDATE workflows
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, idea_id, status, created_at, updated_at;
    `;
    const row = await this.db.queryOne(sql, [status, id]);
    return this.mapRowToWorkflow(row);
  }

  async createWorkflowSteps(
    workflowId: string,
    stepsData: Array<{
      id?: string;
      title: string;
      description: string;
      instructions: string;
      order: number;
      status?: WorkflowStepStatus;
    }>,
  ): Promise<void> {
    for (const s of stepsData) {
      const sql = `
        INSERT INTO workflow_steps (id, workflow_id, title, description, instructions, step_order, status, created_at, updated_at)
        VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, NOW(), NOW());
      `;
      await this.db.execute(sql, [
        s.id || null,
        workflowId,
        s.title,
        s.description || "",
        s.instructions || "",
        s.order,
        s.status || "pending",
      ]);
    }
  }

  async getWorkflowStepsByWorkflowId(
    workflowId: string,
  ): Promise<IWorkflowStep[]> {
    const stepsSql = `
      SELECT id, workflow_id, title, description, instructions, status, step_order, created_at, updated_at
      FROM workflow_steps
      WHERE workflow_id = $1
      ORDER BY step_order ASC;
    `;
    const rows = await this.db.query(stepsSql, [workflowId]);
    const steps: IWorkflowStep[] = rows.map((r) => this.mapRowToStep(r));

    if (steps.length === 0) return [];

    const stepMap = new Map<string, IWorkflowStep>();
    steps.forEach((s) => stepMap.set(s.id, s));

    const depsSql = `
      SELECT d.id, d.step_id, d.depends_on_step_id, d.created_at
      FROM workflow_step_dependencies d
      JOIN workflow_steps s ON d.step_id = s.id
      WHERE s.workflow_id = $1;
    `;
    const depRows = await this.db.query(depsSql, [workflowId]);

    depRows.forEach((r) => {
      const step = stepMap.get(r.step_id);
      const dependsOnStep = stepMap.get(r.depends_on_step_id);
      if (step) {
        const depObj: IWorkflowStepDependency = {
          id: r.id,
          stepId: r.step_id,
          dependsOnStepId: r.depends_on_step_id,
          createdAt: new Date(r.created_at),
          dependsOn: dependsOnStep,
        };
        if (!step.dependencies) step.dependencies = [];
        step.dependencies.push(depObj);
      }
    });

    return steps;
  }

  async getWorkflowStepById(id: string): Promise<IWorkflowStep | null> {
    const sql = `
      SELECT id, workflow_id, title, description, instructions, status, step_order, created_at, updated_at
      FROM workflow_steps
      WHERE id = $1
      LIMIT 1;
    `;
    const row = await this.db.queryOne(sql, [id]);
    if (!row) return null;

    const step = this.mapRowToStep(row);

    const depsSql = `
      SELECT d.id, d.step_id, d.depends_on_step_id, d.created_at,
             s.title AS dep_title, s.status AS dep_status, s.step_order AS dep_order
      FROM workflow_step_dependencies d
      JOIN workflow_steps s ON d.depends_on_step_id = s.id
      WHERE d.step_id = $1;
    `;
    const depRows = await this.db.query(depsSql, [id]);
    step.dependencies = depRows.map((r) => ({
      id: r.id,
      stepId: r.step_id,
      dependsOnStepId: r.depends_on_step_id,
      createdAt: new Date(r.created_at),
      dependsOn: {
        id: r.depends_on_step_id,
        workflowId: step.workflowId,
        title: r.dep_title,
        description: "",
        instructions: "",
        status: r.dep_status as WorkflowStepStatus,
        order: Number(r.dep_order),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }));

    return step;
  }

  async createStepDependencies(
    dependenciesData: Array<{ stepId: string; dependsOnStepId: string }>,
  ): Promise<void> {
    for (const dep of dependenciesData) {
      const sql = `
        INSERT INTO workflow_step_dependencies (step_id, depends_on_step_id, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (step_id, depends_on_step_id) DO NOTHING;
      `;
      await this.db.execute(sql, [dep.stepId, dep.dependsOnStepId]);
    }
  }

  async updateWorkflowStep(
    id: string,
    data: {
      title?: string;
      description?: string;
      instructions?: string;
      status?: WorkflowStepStatus;
      order?: number;
    },
  ): Promise<IWorkflowStep> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.title !== undefined) {
      setClauses.push(`title = $${idx++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      setClauses.push(`description = $${idx++}`);
      values.push(data.description);
    }
    if (data.instructions !== undefined) {
      setClauses.push(`instructions = $${idx++}`);
      values.push(data.instructions);
    }
    if (data.status !== undefined) {
      setClauses.push(`status = $${idx++}`);
      values.push(data.status);
    }
    if (data.order !== undefined) {
      setClauses.push(`step_order = $${idx++}`);
      values.push(data.order);
    }

    if (setClauses.length > 0) {
      setClauses.push(`updated_at = NOW()`);
      values.push(id);

      const sql = `
        UPDATE workflow_steps
        SET ${setClauses.join(", ")}
        WHERE id = $${idx};
      `;
      await this.db.execute(sql, values);
    }

    const updated = await this.getWorkflowStepById(id);
    if (!updated) throw new Error("Workflow step not found");
    return updated;
  }

  async createWorkflowStepVersion(data: {
    stepId: string;
    version: number;
    title: string;
    description: string;
    instructions: string;
    status: WorkflowStepStatus;
    changelog?: string | null;
  }): Promise<IWorkflowStepVersion> {
    const sql = `
      INSERT INTO workflow_step_versions (step_id, version, title, description, instructions, status, changelog, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (step_id, version) DO UPDATE
      SET title = EXCLUDED.title, description = EXCLUDED.description, instructions = EXCLUDED.instructions,
          status = EXCLUDED.status, changelog = EXCLUDED.changelog
      RETURNING id, step_id, version, title, description, instructions, status, changelog, created_at;
    `;
    const row = await this.db.queryOne(sql, [
      data.stepId,
      data.version,
      data.title,
      data.description,
      data.instructions,
      data.status,
      data.changelog || null,
    ]);

    return {
      id: row.id,
      stepId: row.step_id,
      version: Number(row.version),
      title: row.title,
      description: row.description,
      instructions: row.instructions,
      status: row.status as WorkflowStepStatus,
      changelog: row.changelog || null,
      createdAt: new Date(row.created_at),
    };
  }

  async getLatestStepVersion(stepId: string): Promise<number> {
    const sql = `
      SELECT COALESCE(MAX(version), 0) AS max_ver
      FROM workflow_step_versions
      WHERE step_id = $1;
    `;
    const row = await this.db.queryOne(sql, [stepId]);
    return Number(row?.max_ver || 0);
  }

  async getStepVersions(stepId: string): Promise<IWorkflowStepVersion[]> {
    const sql = `
      SELECT id, step_id, version, title, description, instructions, status, changelog, created_at
      FROM workflow_step_versions
      WHERE step_id = $1
      ORDER BY version DESC;
    `;
    const rows = await this.db.query(sql, [stepId]);
    return rows.map((r) => ({
      id: r.id,
      stepId: r.step_id,
      version: Number(r.version),
      title: r.title,
      description: r.description,
      instructions: r.instructions,
      status: r.status as WorkflowStepStatus,
      changelog: r.changelog || null,
      createdAt: new Date(r.created_at),
    }));
  }
}

export const workflowRepository = new WorkflowRepository(DatabaseService.getInstance());

// ============================================================
// Handoff Repository
// ============================================================

@Injectable()
export class HandoffRepository {
  private static instance: HandoffRepository;

  constructor(private readonly db: DatabaseService) {
    HandoffRepository.instance = this;
  }

  static getInstance(): HandoffRepository {
    return HandoffRepository.instance;
  }

  async createPackage(ideaId: string, version: number): Promise<IHandoffPackage> {
    const sql = `
      INSERT INTO handoff_packages (idea_id, version, status, created_at, updated_at)
      VALUES ($1, $2, 'generating', NOW(), NOW())
      ON CONFLICT (idea_id, version) DO UPDATE
      SET status = 'generating', updated_at = NOW()
      RETURNING id, idea_id, version, status, zip_path, created_at, updated_at;
    `;
    const row = await this.db.queryOne(sql, [ideaId, version]);
    return {
      id: row.id,
      ideaId: row.idea_id,
      version: Number(row.version),
      status: row.status as HandoffPackageStatus,
      zipPath: row.zip_path || null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      artifacts: [],
    };
  }

  async updatePackageStatus(
    id: string,
    status: string,
    zipPath?: string,
  ): Promise<IHandoffPackage> {
    const sql = `
      UPDATE handoff_packages
      SET status = $1, zip_path = COALESCE($2, zip_path), updated_at = NOW()
      WHERE id = $3
      RETURNING id, idea_id, version, status, zip_path, created_at, updated_at;
    `;
    const row = await this.db.queryOne(sql, [status, zipPath || null, id]);
    return {
      id: row.id,
      ideaId: row.idea_id,
      version: Number(row.version),
      status: row.status as HandoffPackageStatus,
      zipPath: row.zip_path || null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  async getLatestPackageByIdeaId(
    ideaId: string,
  ): Promise<IHandoffPackage | null> {
    const sql = `
      SELECT id, idea_id, version, status, zip_path, created_at, updated_at
      FROM handoff_packages
      WHERE idea_id = $1
      ORDER BY version DESC
      LIMIT 1;
    `;
    const row = await this.db.queryOne(sql, [ideaId]);
    if (!row) return null;

    const artifactsSql = `
      SELECT id, package_id, file_path, title, file_type, created_at, updated_at
      FROM handoff_artifacts
      WHERE package_id = $1
      ORDER BY file_path ASC;
    `;
    const artRows = await this.db.query(artifactsSql, [row.id]);

    return {
      id: row.id,
      ideaId: row.idea_id,
      version: Number(row.version),
      status: row.status as HandoffPackageStatus,
      zipPath: row.zip_path || null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      artifacts: artRows.map((a) => ({
        id: a.id,
        packageId: a.package_id,
        filePath: a.file_path,
        title: a.title,
        content: "",
        fileType: a.file_type as HandoffArtifactFileType,
        createdAt: new Date(a.created_at),
        updatedAt: new Date(a.updated_at),
      })),
    };
  }

  async getPackageWithArtifacts(
    packageId: string,
  ): Promise<IHandoffPackage | null> {
    const sql = `
      SELECT id, idea_id, version, status, zip_path, created_at, updated_at
      FROM handoff_packages
      WHERE id = $1
      LIMIT 1;
    `;
    const row = await this.db.queryOne(sql, [packageId]);
    if (!row) return null;

    const artifacts = await this.getArtifactsByPackageId(packageId);

    return {
      id: row.id,
      ideaId: row.idea_id,
      version: Number(row.version),
      status: row.status as HandoffPackageStatus,
      zipPath: row.zip_path || null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      artifacts,
    };
  }

  async getNextVersion(ideaId: string): Promise<number> {
    const sql = `
      SELECT COALESCE(MAX(version), 0) + 1 AS next_ver
      FROM handoff_packages
      WHERE idea_id = $1;
    `;
    const row = await this.db.queryOne(sql, [ideaId]);
    return Number(row?.next_ver || 1);
  }

  async upsertArtifact(
    packageId: string,
    filePath: string,
    title: string,
    content: string,
    fileType: string,
  ): Promise<IHandoffArtifact> {
    const sql = `
      INSERT INTO handoff_artifacts (package_id, file_path, title, content, file_type, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (package_id, file_path) DO UPDATE
      SET content = EXCLUDED.content, title = EXCLUDED.title, file_type = EXCLUDED.file_type, updated_at = NOW()
      RETURNING id, package_id, file_path, title, content, file_type, created_at, updated_at;
    `;
    const row = await this.db.queryOne(sql, [
      packageId,
      filePath,
      title,
      content,
      fileType,
    ]);

    return {
      id: row.id,
      packageId: row.package_id,
      filePath: row.file_path,
      title: row.title,
      content: row.content,
      fileType: row.file_type as HandoffArtifactFileType,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  async getArtifactById(artifactId: string): Promise<IHandoffArtifact | null> {
    const sql = `
      SELECT id, package_id, file_path, title, content, file_type, created_at, updated_at
      FROM handoff_artifacts
      WHERE id = $1
      LIMIT 1;
    `;
    const row = await this.db.queryOne(sql, [artifactId]);
    if (!row) return null;

    return {
      id: row.id,
      packageId: row.package_id,
      filePath: row.file_path,
      title: row.title,
      content: row.content,
      fileType: row.file_type as HandoffArtifactFileType,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  async getArtifactsByPackageId(
    packageId: string,
  ): Promise<IHandoffArtifact[]> {
    const sql = `
      SELECT id, package_id, file_path, title, content, file_type, created_at, updated_at
      FROM handoff_artifacts
      WHERE package_id = $1
      ORDER BY file_path ASC;
    `;
    const rows = await this.db.query(sql, [packageId]);
    return rows.map((r) => ({
      id: r.id,
      packageId: r.package_id,
      filePath: r.file_path,
      title: r.title,
      content: r.content,
      fileType: r.file_type as HandoffArtifactFileType,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    }));
  }

  async updateArtifactContent(
    artifactId: string,
    content: string,
    changelog?: string,
  ): Promise<IHandoffArtifact> {
    const artifact = await this.getArtifactById(artifactId);
    if (!artifact) throw new Error("Artifact not found");

    const nextVerSql = `
      SELECT COALESCE(MAX(version), 0) + 1 AS next_ver
      FROM handoff_artifact_versions
      WHERE artifact_id = $1;
    `;
    const verRow = await this.db.queryOne(nextVerSql, [artifactId]);
    const nextVersion = Number(verRow?.next_ver || 1);

    // Save snapshot
    const snapSql = `
      INSERT INTO handoff_artifact_versions (artifact_id, version, content, changelog, created_at)
      VALUES ($1, $2, $3, $4, NOW());
    `;
    await this.db.execute(snapSql, [
      artifactId,
      nextVersion,
      artifact.content,
      changelog || "Manual edit",
    ]);

    // Update content
    const updateSql = `
      UPDATE handoff_artifacts
      SET content = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, package_id, file_path, title, content, file_type, created_at, updated_at;
    `;
    const row = await this.db.queryOne(updateSql, [content, artifactId]);

    return {
      id: row.id,
      packageId: row.package_id,
      filePath: row.file_path,
      title: row.title,
      content: row.content,
      fileType: row.file_type as HandoffArtifactFileType,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const handoffRepository = new HandoffRepository(DatabaseService.getInstance());
