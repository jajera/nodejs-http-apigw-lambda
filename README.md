# nodejs-http-apigw-lambda

## build

### nodejs

```bash
npm init -y
```

```bash
npm --prefix ./src install @aws-sdk/client-dynamodb@^3.637.0
npm --prefix ./src install @aws-sdk/lib-dynamodb@^3.637.0
```

```bash
npm --prefix ./src install --save-dev jest@^29.7.0
npm --prefix ./src install --save-dev babel-jest@^29.7.0
npm --prefix ./src install --save-dev @babel/preset-env@^7.25.4
```

```bash
npm --prefix ./src test
```

```bash
npm --prefix ./src run build
```

### terraform

```bash
aws-vault exec dev -- terraform -chdir=./terraform init
```

```bash
aws-vault exec dev -- terraform -chdir=./terraform apply --auto-approve --target=data.archive_file.lambda

```bash
aws-vault exec dev -- terraform -chdir=./terraform apply --auto-approve
```

## notes

Note that you cannot delete an API gateway if it still has API deployments on it (including API deployments that are in different compartments to the API gateway itself). You must delete the API deployments first.
