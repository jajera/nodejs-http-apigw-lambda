resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

locals {
  name = "http-apigw-lambda-${random_string.suffix.result}"
}

resource "aws_iam_role" "lambda" {
  name = local.name

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda" {
  name = local.name
  role = aws_iam_role.lambda.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "logs:CreateLogGroup",
        ],
        Resource = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"
      },
      {
        Effect = "Allow",
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        Resource = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.name}*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "xray" {
  policy_arn = "arn:aws:iam::aws:policy/AWSXrayWriteOnlyAccess"
  role       = aws_iam_role.lambda.name
}

data "archive_file" "lambda" {
  type        = "zip"
  output_path = "${path.module}/external/http_apigw.zip"
  source_dir  = "../${path.module}/src/dist"
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.name}"
  retention_in_days = 1

  lifecycle {
    prevent_destroy = false
  }
}

resource "aws_lambda_function" "example" {
  function_name    = local.name
  filename         = "${path.module}/external/http_apigw.zip"
  handler          = "httpApiGateway.handler"
  role             = aws_iam_role.lambda.arn
  runtime          = "nodejs20.x"
  source_code_hash = filebase64sha256("${path.module}/external/http_apigw.zip")
  timeout          = 5

  tracing_config {
    mode = "Active"
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda
  ]
}

resource "aws_lambda_permission" "nonprod_get" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.example.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${aws_apigatewayv2_api.example.id}/nonprod/GET/employee/*"
}

resource "aws_lambda_permission" "nonprod_employee_get" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.example.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${aws_apigatewayv2_api.example.id}/nonprod/GET/employee"
}

resource "aws_lambda_permission" "nonprod_employee_post" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.example.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${aws_apigatewayv2_api.example.id}/nonprod/POST/employee"
}

resource "aws_cloudwatch_log_group" "apigateway_nonprod" {
  name              = "/aws/apigateway/${local.name}/nonprod"
  retention_in_days = 1

  lifecycle {
    prevent_destroy = false
  }
}

resource "aws_apigatewayv2_api" "example" {
  name          = local.name
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_stage" "nonprod" {
  api_id      = aws_apigatewayv2_api.example.id
  name        = "nonprod"
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "nonprod" {
  api_id                 = aws_apigatewayv2_api.example.id
  connection_type        = "INTERNET"
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.example.invoke_arn
  passthrough_behavior   = "WHEN_NO_MATCH"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "employee_get" {
  api_id    = aws_apigatewayv2_api.example.id
  route_key = "GET /employee"
  target    = "integrations/${aws_apigatewayv2_integration.nonprod.id}"
}

resource "aws_apigatewayv2_route" "employee_post" {
  api_id    = aws_apigatewayv2_api.example.id
  route_key = "POST /employee"
  target    = "integrations/${aws_apigatewayv2_integration.nonprod.id}"
}

resource "aws_apigatewayv2_route" "employee_id_get" {
  api_id    = aws_apigatewayv2_api.example.id
  route_key = "GET /employee/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.nonprod.id}"
}

data "http" "employee_get_all" {
  url = "${aws_apigatewayv2_stage.nonprod.invoke_url}/employee"

  depends_on = [
    aws_apigatewayv2_route.employee_get
  ]
}

data "http" "employee_get_range" {
  url = "${aws_apigatewayv2_stage.nonprod.invoke_url}/employee?start=1&end=4"

  depends_on = [
    aws_apigatewayv2_route.employee_get
  ]
}

data "http" "employee_get_1" {
  url = "${aws_apigatewayv2_stage.nonprod.invoke_url}/employee/1"

  depends_on = [
    aws_apigatewayv2_route.employee_id_get
  ]
}

data "http" "employee_post_lucy" {
  url    = "${aws_apigatewayv2_stage.nonprod.invoke_url}/employee"
  method = "POST"
  request_headers = {
    "Content-Type" = "application/json"
  }
  request_body = jsonencode({
    employee_id = 5
    name        = "lucy"
  })

  depends_on = [
    aws_apigatewayv2_route.employee_post
  ]
}
