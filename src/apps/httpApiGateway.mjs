import path from "path";

// Define the EMPLOYEES array
const EMPLOYEES = [
  { name: "liam", employee_id: 1 },
  { name: "oliver", employee_id: 2 },
  { name: "charlotte", employee_id: 3 },
  { name: "isla", employee_id: 4 },
];

// For local testing / direct execution
const scriptName = "httpApiGateway.mjs";

function getValidRange(start, end, length) {
  let validStart = 0;
  let validEnd = length;

  if (isNaN(start) || isNaN(end)) {
    return { start: 0, end: 0 };
  }

  if (start >= 0 && start < length) {
    validStart = start;
  } else {
    validStart = 0;
    validEnd = 0;
  }

  if (end > validStart && end <= length) {
    validEnd = end;
  } else if (end > length && start > length) {
    validEnd = 0;
  } else if (end > length) {
    validEnd = length;
  } else {
    validStart = 0;
    validEnd = 0;
  }

  return { start: validStart, end: validEnd };
}

export const handler = async (event) => {
  try {
    console.log(event);

    let result = "";

    if (event.routeKey === "GET /employee") {
      try {
        let result;

        if (event.queryStringParameters) {
          const start = Number(event.queryStringParameters.start);
          const end = Number(event.queryStringParameters.end);

          if (isNaN(start) || isNaN(end)) {
            throw new Error("Invalid query parameters");
          }

          const { start: validStart, end: validEnd } = getValidRange(
            start,
            end,
            EMPLOYEES.length
          );

          result = JSON.stringify(EMPLOYEES.slice(validStart, validEnd));
        } else {
          result = JSON.stringify(EMPLOYEES);
        }

        return {
          statusCode: 200,
          body: result,
        };
      } catch (error) {
        console.error(`Error processing request: ${error.message}`);
        return {
          statusCode: 500,
          body: JSON.stringify({
            message: "An error occurred while processing the request.",
            error: error.message,
          }),
        };
      }
    } else if (event.routeKey === "POST /employee") {
      try {
        EMPLOYEES.push(JSON.parse(event.body));
        result = JSON.stringify(EMPLOYEES);
      } catch (parseError) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Invalid body format" }),
        };
      }
    } else if (event.routeKey === "GET /employee/{id}") {
      result = JSON.stringify(
        EMPLOYEES.find((e) => e.employee_id == event.pathParameters.id)
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: result }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: err.message }),
    };
  }
};

// Simulate event handling for direct execution
if (process.argv[1] && path.basename(process.argv[1]) === scriptName) {
  const start = 5;
  const end = 10;
  const length = 15;

  const { start: validStart, end: validEnd } = getValidRange(
    start,
    end,
    length
  );

  const exampleEvent = {
    routeKey: "GET /employee",
    queryStringParameters: {
      start: validStart.toString(),
      end: validEnd.toString(),
    },
  };

  (async () => {
    try {
      const response = await handler(exampleEvent);
    } catch (err) {
      console.error("Error running handler:", err.message);
    }
  })();
}
