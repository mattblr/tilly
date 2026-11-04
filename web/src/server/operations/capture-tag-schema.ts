/** JSON-schema contract served to native/web operation generators. */
export const captureTagSchema = {
  type: "array",
  minItems: 1,
  maxItems: 8,
  items: {
    type: "object",
    required: ["key"],
    additionalProperties: false,
    properties: {
      key: {
        type: "string",
        minLength: 1,
        maxLength: 64,
        pattern: "^[a-zA-Z0-9-]+$",
      },
      catId: { type: "string", pattern: "^[a-z0-9]{10,40}$" },
      name: { type: "string", minLength: 1, maxLength: 60 },
      position: {
        type: "object",
        required: ["x", "y"],
        additionalProperties: false,
        properties: {
          x: { type: "number", minimum: 0, maximum: 1 },
          y: { type: "number", minimum: 0, maximum: 1 },
        },
      },
      bounds: {
        type: "object",
        required: ["x", "y", "width", "height"],
        additionalProperties: false,
        properties: {
          x: { type: "number", minimum: 0, maximum: 1 },
          y: { type: "number", minimum: 0, maximum: 1 },
          width: { type: "number", exclusiveMinimum: 0, maximum: 1 },
          height: { type: "number", exclusiveMinimum: 0, maximum: 1 },
        },
      },
      vector: {
        type: "array",
        minItems: 1,
        maxItems: 2048,
        items: { type: "number" },
      },
      vectorModel: { type: "string", minLength: 1, maxLength: 80 },
    },
  },
};
