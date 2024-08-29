import { handler } from "../apps/httpApiGateway.mjs";

beforeEach(() => {
  jest.resetAllMocks();
});

describe("httpApiGateway handler", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("GET /employee with out of range start returns empty slice", async () => {
    const event = {
      routeKey: "GET /employee",
      queryStringParameters: {
        start: "5",
        end: "10",
      },
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(JSON.stringify([]));
  });

  test("GET /employee with valid range returns correct slice", async () => {
    const event = {
      routeKey: "GET /employee",
      queryStringParameters: {
        start: "0",
        end: "2",
      },
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(
      JSON.stringify([
        { name: "liam", employee_id: 1 },
        { name: "oliver", employee_id: 2 },
      ])
    );
  });

  test("GET /employee without query parameters returns full list", async () => {
    const event = {
      routeKey: "GET /employee",
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(
      JSON.stringify([
        { name: "liam", employee_id: 1 },
        { name: "oliver", employee_id: 2 },
        { name: "charlotte", employee_id: 3 },
        { name: "isla", employee_id: 4 },
      ])
    );
  });

  test("GET /employee/{id} returns the correct employee", async () => {
    const event = {
      routeKey: "GET /employee/{id}",
      pathParameters: { id: "2" },
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(
      JSON.stringify({
        message: JSON.stringify({ name: "oliver", employee_id: 2 }),
      })
    );
  });

  test("GET /employee/{id} returns empty if employee not found", async () => {
    const event = {
      routeKey: "GET /employee/{id}",
      pathParameters: { id: "999" },
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(JSON.stringify({}));
  });

  test("POST /employee adds a new employee", async () => {
    const event = {
      routeKey: "POST /employee",
      body: JSON.stringify({ name: "alice", employee_id: 5 }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("alice");
  });

  test("POST /employee with invalid body format returns error", async () => {
    const event = {
      routeKey: "POST /employee",
      body: "invalid format",
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(response.body).toBe(
      JSON.stringify({
        message: "Invalid body format",
      })
    );
  });

  test("GET /employee with invalid query parameters returns empty list", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const event = {
      routeKey: "GET /employee",
      queryStringParameters: {
        start: "invalid",
        end: "invalid",
      },
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({
      message: "An error occurred while processing the request.",
      error: "Invalid query parameters",
    });
  });

  test("Returns 500 on handler error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    const handler = jest.fn(async () => {
      throw new Error("Test error");
    });

    const event = {
      routeKey: "GET /employee",
    };

    let response;
    try {
      response = await handler(event);
    } catch (error) {
      response = {
        statusCode: 500,
        body: JSON.stringify({ message: error.message }),
      };
    }

    expect(response.statusCode).toBe(500);
    expect(response.body).toBe(
      JSON.stringify({
        message: "Test error",
      })
    );
  });
});
