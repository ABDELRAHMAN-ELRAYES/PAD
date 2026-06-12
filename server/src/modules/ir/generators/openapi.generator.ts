import { ProjectIRSchema } from "../types/ir.types";

/**
 * Deterministically generates an OpenAPI 3.0.0 JSON specification string from the structured IR schema.
 * Operates purely programmatically based on entities, attributes, and relationships.
 */
export function generateOpenAPISpec(ir: ProjectIRSchema, projectName: string = "Project API"): string {
  const spec: any = {
    openapi: "3.0.0",
    info: {
      title: projectName,
      version: "1.0.0",
      description: `Generated OpenAPI 3.0.0 specification for ${projectName} based on the system Intermediate Representation.`,
    },
    paths: {},
    components: {
      schemas: {},
    },
  };

  for (const entity of ir.entities) {
    const entityPlural = entity.name.toLowerCase() + "s";
    const entitySingular = entity.name;
    const schemaName = entity.name;

    // 1. Build Component Schema
    const properties: any = {};
    const required: string[] = [];

    for (const field of entity.fields) {
      const typeLower = field.type.toLowerCase();
      let openApiType: string = "string";
      let format: string | undefined = undefined;

      if (typeLower.includes("int") || typeLower.includes("number") || typeLower.includes("float")) {
        openApiType = "number";
      } else if (typeLower.includes("bool")) {
        openApiType = "boolean";
      } else if (typeLower.includes("date") || typeLower.includes("time")) {
        openApiType = "string";
        format = "date-time";
      }

      properties[field.name] = {
        type: openApiType,
        description: field.description || `${field.name} field`,
      };

      if (format) {
        properties[field.name].format = format;
      }

      if (!field.isNullable) {
        required.push(field.name);
      }
    }

    spec.components.schemas[schemaName] = {
      type: "object",
      properties,
    };
    if (required.length > 0) {
      spec.components.schemas[schemaName].required = required;
    }

    // 2. Build Paths (CRUD)
    const listPath = `/api/v1/${entityPlural}`;
    const detailPath = `/api/v1/${entityPlural}/{id}`;

    spec.paths[listPath] = {
      get: {
        summary: `List all ${entityPlural}`,
        operationId: `list${entity.name}s`,
        responses: {
          "200": {
            description: `A list of ${entityPlural}`,
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/${schemaName}`,
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: `Create a new ${entitySingular}`,
        operationId: `create${entitySingular}`,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: `#/components/schemas/${schemaName}`,
              },
            },
          },
        },
        responses: {
          "201": {
            description: `The created ${entitySingular}`,
            content: {
              "application/json": {
                schema: {
                  $ref: `#/components/schemas/${schemaName}`,
                },
              },
            },
          },
        },
      },
    };

    spec.paths[detailPath] = {
      get: {
        summary: `Get a ${entitySingular} by ID`,
        operationId: `get${entitySingular}ById`,
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
            description: `The unique identifier of the ${entitySingular}`,
          },
        ],
        responses: {
          "200": {
            description: `${entitySingular} details`,
            content: {
              "application/json": {
                schema: {
                  $ref: `#/components/schemas/${schemaName}`,
                },
              },
            },
          },
          "404": {
            description: `${entitySingular} not found`,
          },
        },
      },
      put: {
        summary: `Update an existing ${entitySingular}`,
        operationId: `update${entitySingular}`,
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
            description: `The unique identifier of the ${entitySingular}`,
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: `#/components/schemas/${schemaName}`,
              },
            },
          },
        },
        responses: {
          "200": {
            description: `The updated ${entitySingular}`,
            content: {
              "application/json": {
                schema: {
                  $ref: `#/components/schemas/${schemaName}`,
                },
              },
            },
          },
          "404": {
            description: `${entitySingular} not found`,
          },
        },
      },
      delete: {
        summary: `Delete a ${entitySingular}`,
        operationId: `delete${entitySingular}`,
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
            description: `The unique identifier of the ${entitySingular}`,
          },
        ],
        responses: {
          "204": {
            description: `${entitySingular} deleted successfully`,
          },
          "404": {
            description: `${entitySingular} not found`,
          },
        },
      },
    };
  }

  return JSON.stringify(spec, null, 2);
}
