# Go 单元测试完整指南

> 一份全面的 Go 测试指南，从基础到进阶，涵盖测试最佳实践和 SonarQube 集成。

## 目录

1. [基础概念](#1-基础概念)
2. [第一个测试](#2-第一个测试)
3. [测试文件规范](#3-测试文件规范)
4. [测试覆盖率](#4-测试覆盖率)
5. [表驱动测试](#5-表驱动测试)
6. [Mock 和接口测试](#6-mock-和接口测试)
7. [测试组织结构](#7-测试组织结构)
8. [Makefile 测试目标](#8-makefile-测试目标)
9. [SonarQube 覆盖率集成](#9-sonarqube-覆盖率集成)
10. [最佳实践](#10-最佳实践)
11. [常用工具和库](#11-常用工具和库)
12. [快速参考](#12-快速参考)
13. [完整示例](#13-完整示例)
14. [总结](#14-总结)


## 1. 基础概念

### 什么是单元测试

单元测试是对软件中最小可测试单元（通常是函数或方法）进行验证的过程。在 Go 中，单元测试是内置功能，无需额外框架。

### 为什么要写测试

- **提高代码质量**：及早发现 bug
- **重构保障**：确保重构不会破坏现有功能
- **文档作用**：测试代码展示了函数的预期行为
- **设计驱动**：写测试能帮助你思考 API 设计

### Go 测试的基本规则

| 规则 | 说明 |
|------|------|
| 文件命名 | 测试文件必须以 `_test.go` 结尾 |
| 函数命名 | 测试函数必须以 `Test` 开头 |
| 函数签名 | `func TestXxx(t *testing.T)` |
| 包位置 | 测试文件与被测试文件放在同一包中 |
| 导入包 | 需要导入 `testing` 包 |

### 测试类型

```go
// 单元测试 - 测试单个函数或方法
func TestAdd(t *testing.T) { }

// 基准测试 - 测试性能
func BenchmarkAdd(b *testing.B) { }

// 示例测试 - 既是文档又是测试
func ExampleAdd() { }

// 子测试 - 分组测试
func TestAdd(t *testing.T) {
    t.Run("positive", func(t *testing.T) { })
    t.Run("negative", func(t *testing.T) { })
}

// 表格驱动测试 - 多场景测试
func TestAdd(t *testing.T) {
    tests := []struct { /* ... */ }
    for _, tt := range tests { }
}
```


## 2. 第一个测试

### 步骤 1: 创建被测试函数

```go
// utils/string.go
package utils

// ToUpper 将字符串转换为大写
func ToUpper(s string) string {
    if s == "" {
        return ""
    }
    result := make([]rune, len(s))
    for i, r := range s {
        if r >= 'a' && r <= 'z' {
            result[i] = r - 32
        } else {
            result[i] = r
        }
    }
    return string(result)
}
```

### 步骤 2: 创建测试文件

```go
// utils/string_test.go
package utils

import "testing"

func TestToUpper(t *testing.T) {
    // Arrange (准备测试数据)
    input := "hello"
    expected := "HELLO"

    // Act (执行被测试函数)
    result := ToUpper(input)

    // Assert (验证结果)
    if result != expected {
        t.Errorf("ToUpper(%q) = %q; want %q", input, result, expected)
    }
}
```

### 步骤 3: 运行测试

```bash
# 运行当前包的测试
go test

# 运行所有包的测试
go test ./...

# 运行特定包的测试
go test ./utils

# 运行特定测试函数
go test ./utils -run TestToUpper

# 详细输出（显示每个测试）
go test -v ./utils

# 显示覆盖率
go test -cover ./utils
```

### 测试输出说明

```bash
$ go test -v
=== RUN   TestToUpper
--- PASS: TestToUpper (0.00s)
PASS
ok      utils   0.001s
```


## 3. 测试文件规范

### 3.1 文件命名

| 源文件 | 测试文件 | 说明 |
|--------|----------|------|
| `user.go` | `user_test.go` | 基本测试文件 |
| `auth_service.go` | `auth_service_test.go` | 下划线命名 |
| `utils/time.go` | `time_test.go` | 与源文件同目录 |

### 3.2 包声明

```go
// 方式 1: 黑盒测试（推荐）
// 测试代码作为包的外部用户，只能访问导出的标识符
package utils_test

import "yourproject/utils"

func TestPublicFunction(t *testing.T) {
    utils.SomeFunction() // 只能测试公开函数
}

// 方式 2: 白盒测试
// 可访问包内部未导出的标识符
package utils

func TestInternalFunction(t *testing.T) {
    internalFunction() // 可以测试内部函数
}
```

**选择建议**：
- 黑盒测试：测试公开 API，更接近实际使用
- 白盒测试：测试内部逻辑，需要注意内部实现变化

### 3.3 测试函数命名

```go
// 好的命名 - 清晰描述测试意图
func TestUserService_CreateUser_Success(t *testing.T) { }
func TestUserService_CreateUser_DuplicateEmail(t *testing.T) { }
func TestUserService_CreateUser_InvalidInput(t *testing.T) { }

// 不好的命名 - 模糊不清
func TestUserService1(t *testing.T) { }
func TestCreate(t *testing.T) { }
func TestFeature(t *testing.T) { }
```

### 3.4 测试文件结构

```go
package utils

import (
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

// 测试组
func TestToUpper(t *testing.T) {
    // 子测试
    t.Run("lowercase input", func(t *testing.T) { })
    t.Run("mixed case input", func(t *testing.T) { })
    t.Run("empty string", func(t *testing.T) { })
}

// 辅助函数
func setup(t *testing.T) *Config {
    t.Helper()
    return &Config{}
}

func teardown(t *testing.T, c *Config) {
    t.Helper()
    // 清理资源
}
```


## 4. 测试覆盖率

### 4.1 查看覆盖率

```bash
# 生成覆盖率报告
go test -coverprofile=coverage.out ./...

# 查看覆盖率百分比（每个函数）
go tool cover -func=coverage.out

# 生成 HTML 覆盖率报告
go tool cover -html=coverage.out -o coverage.html

# 在终端显示覆盖率百分比
go test -cover ./...

# 按包查看覆盖率
go test -coverprofile=coverage.out ./... && \
go tool cover -func=coverage.out | grep "^total:"
```

### 4.2 覆盖率报告解读

```bash
$ go tool cover -func=coverage.out
github.com/user/project/utils/string.go:10:    ToUpper    100.0%
github.com/user/project/utils/string.go:20:    ToLower    50.0%
total:                                            75.0%
```

### 4.3 设置覆盖率目标

```bash
# 检查覆盖率是否达到 80%
go test -coverprofile=coverage.out ./... && \
go tool cover -func=coverage.out | \
tail -1 | \
awk '{if ($3+0 < 80) {print "Coverage below 80%"; exit 1}}'
```

### 4.4 覆盖率模式

Go 支持三种覆盖率模式：

| 模式 | 说明 | 推荐场景 |
|------|------|----------|
| `set` | 默认，只记录是否覆盖 | 本地开发 |
| `count` | 记录执行次数 | 性能分析 |
| `atomic` | 原子操作，并发安全 | **CI/CD 环境** |

```bash
# CI/CD 推荐：使用 atomic 模式
go test -coverprofile=coverage.out -covermode=atomic ./...

# 开发环境：使用默认 set 模式
go test -coverprofile=coverage.out ./...
```

### 4.5 排除不需要测试的代码

```go
// 使用构建标签排除整个文件
// +build !integration

package main

func testIntegration() { }
```

```bash
# 或者在测试时排除特定目录
go test -coverprofile=coverage.out $(go list ./... | grep -v /vendor/)
```


## 5. 表驱动测试

表驱动测试是 Go 中最推荐的测试模式，可以轻松测试多个场景。

### 5.1 基本示例

```go
func TestParseDuration(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    time.Duration
        wantErr bool
    }{
        {
            name:    "valid seconds",
            input:   "5s",
            want:    5 * time.Second,
            wantErr: false,
        },
        {
            name:    "valid minutes",
            input:   "10m",
            want:    10 * time.Minute,
            wantErr: false,
        },
        {
            name:    "valid days",
            input:   "2d",
            want:    48 * time.Hour,
            wantErr: false,
        },
        {
            name:    "invalid input",
            input:   "invalid",
            want:    0,
            wantErr: true,
        },
        {
            name:    "empty string",
            input:   "",
            want:    0,
            wantErr: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ParseDuration(tt.input)
            if (err != nil) != tt.wantErr {
                t.Errorf("ParseDuration(%q) error = %v, wantErr %v",
                    tt.input, err, tt.wantErr)
                return
            }
            if got != tt.want {
                t.Errorf("ParseDuration(%q) = %v, want %v",
                    tt.input, got, tt.want)
            }
        })
    }
}
```

### 5.2 使用辅助函数

```go
func TestToUpper(t *testing.T) {
    tests := []struct {
        name     string
        input    string
        expected string
    }{
        {"lowercase", "hello", "HELLO"},
        {"mixed case", "HeLLo", "HELLO"},
        {"empty string", "", ""},
        {"with numbers", "hello123", "HELLO123"},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := ToUpper(tt.input)
            if result != tt.expected {
                t.Errorf("got %q, want %q", result, tt.expected)
            }
        })
    }
}
```

### 5.3 并行测试

```go
func TestParallel(t *testing.T) {
    tests := []struct {
        name string
        input string
    }{
        {"test1", "input1"},
        {"test2", "input2"},
        {"test3", "input3"},
    }

    for _, tt := range tests {
        tt := tt // 创建局部变量副本
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel() // 标记为可并行运行
            // 测试逻辑
        })
    }
}
```

### 5.4 表驱动测试最佳实践

```go
// ✅ 好的做法
func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"positive numbers", 2, 3, 5},
        {"negative numbers", -2, -3, -5},
        {"mixed numbers", -2, 3, 1},
        {"zeros", 0, 0, 0},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := Add(tt.a, tt.b)
            if result != tt.expected {
                t.Errorf("Add(%d, %d) = %d; want %d",
                    tt.a, tt.b, result, tt.expected)
            }
        })
    }
}

// ❌ 不好的做法 - 没有使用子测试
func TestAdd_Bad(t *testing.T) {
    if Add(2, 3) != 5 {
        t.Error("test 1 failed")
    }
    if Add(-2, -3) != -5 {
        t.Error("test 2 failed")
    }
    // 如果第一个测试失败，后续测试不会执行
}
```


## 6. Mock 和接口测试

### 6.1 使用接口进行 Mock

```go
// 定义接口
type UserRepository interface {
    FindByID(id int) (*User, error)
    Create(user *User) error
    Update(user *User) error
    Delete(id int) error
}

// 被测试的服务
type UserService struct {
    repo UserRepository
}

func (s *UserService) GetUserName(id int) (string, error) {
    user, err := s.repo.FindByID(id)
    if err != nil {
        return "", err
    }
    return user.Name, nil
}
```

### 6.2 手动 Mock

```go
// mock_user_repository.go
package mocks

type MockUserRepository struct {
    users map[int]*User
}

func NewMockUserRepository() *MockUserRepository {
    return &MockUserRepository{
        users: make(map[int]*User),
    }
}

func (m *MockUserRepository) FindByID(id int) (*User, error) {
    user, ok := m.users[id]
    if !ok {
        return nil, fmt.Errorf("user not found")
    }
    return user, nil
}

func (m *MockUserRepository) Create(user *User) error {
    m.users[user.ID] = user
    return nil
}

func (m *MockUserRepository) Update(user *User) error {
    if _, ok := m.users[user.ID]; !ok {
        return fmt.Errorf("user not found")
    }
    m.users[user.ID] = user
    return nil
}

func (m *MockUserRepository) Delete(id int) error {
    delete(m.users, id)
    return nil
}
```

### 6.3 使用 Mock 进行测试

```go
func TestUserService_GetUserName(t *testing.T) {
    // Setup
    mockRepo := NewMockUserRepository()
    mockRepo.Create(&User{ID: 1, Name: "Alice"})

    service := &UserService{repo: mockRepo}

    // Act
    name, err := service.GetUserName(1)

    // Assert
    if err != nil {
        t.Errorf("unexpected error: %v", err)
    }
    if name != "Alice" {
        t.Errorf("got name %q, want %q", name, "Alice")
    }
}
```

### 6.4 使用 gomock（推荐）

```bash
# 安装 gomock
go install github.com/golang/mock/mockgen@latest

# 生成 mock
//go:generate go run github.com/golang/mock/mockgen -source=user.go -destination=mock_user_repository.go
```

```go
func TestUserService_GetUserName_WithMock(t *testing.T) {
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()

    mockRepo := mocks.NewMockUserRepository(ctrl)
    mockRepo.EXPECT().
        FindByID(1).
        Return(&User{ID: 1, Name: "Alice"}, nil).
        Times(1)

    service := &UserService{repo: mockRepo}

    name, err := service.GetUserName(1)

    if err != nil {
        t.Errorf("unexpected error: %v", err)
    }
    if name != "Alice" {
        t.Errorf("got name %q, want %q", name, "Alice")
    }
}
```

### 6.5 使用 httptest 测试 HTTP 处理器

```go
func TestHandler(t *testing.T) {
    handler := func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("OK"))
    }

    req := httptest.NewRequest("GET", "/test", nil)
    rec := httptest.NewRecorder()

    handler(rec, req)

    res := rec.Result()
    defer res.Body.Close()

    if res.StatusCode != http.StatusOK {
        t.Errorf("got status %d, want %d", res.StatusCode, http.StatusOK)
    }

    data, _ := io.ReadAll(res.Body)
    if string(data) != "OK" {
        t.Errorf("got body %q, want %q", string(data), "OK")
    }
}
```

### 6.6 测试 HTTP 客户端

```go
func TestAPIClient_CallAPI(t *testing.T) {
    // 创建测试服务器
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if r.URL.Path != "/api/users" {
            t.Errorf("unexpected path: %s", r.URL.Path)
        }
        w.WriteHeader(http.StatusOK)
        w.Write([]byte(`{"name":"Alice"}`))
    }))
    defer server.Close()

    // 创建客户端并使用测试服务器 URL
    client := NewAPIClient(server.URL)

    user, err := client.GetUser("1")
    if err != nil {
        t.Errorf("unexpected error: %v", err)
    }
    if user.Name != "Alice" {
        t.Errorf("got name %q, want %q", user.Name, "Alice")
    }
}
```


## 7. 测试组织结构

### 7.1 推荐的项目结构

```
project/
├── cmd/
│   └── server/
│       ├── main.go
│       └── main_test.go
├── internal/
│   ├── user/
│   │   ├── user.go                    # 源代码
│   │   ├── user_test.go               # 单元测试
│   │   └── user_integration_test.go   # 集成测试
│   └── auth/
│       ├── auth.go
│       └── auth_test.go
├── pkg/
│   └── utils/
│       ├── string.go
│       └── string_test.go
├── test/
│   ├── mocks/                         # Mock 文件
│   │   ├── mock_user_repository.go
│   │   └── mock_auth_service.go
│   ├── fixtures/                      # 测试数据
│   │   ├── users.json
│   │   └── config.yaml
│   └── testutil/                      # 测试工具函数
│       ├── db.go
│       └── http.go
├── go.mod
├── go.sum
├── Makefile
└── README.md
```

### 7.2 测试文件组织

```go
// user.go - 源代码
package user

type User struct {
    ID   int
    Name string
}

type Repository interface {
    FindByID(id int) (*User, error)
    Create(user *User) error
}

// user_test.go - 单元测试
package user

import "testing"

func TestUser_Validate(t *testing.T) {
    // 单元测试
}

// user_integration_test.go - 集成测试
// +build integration

package user

import "testing"

func TestUserRepository_Integration(t *testing.T) {
    // 集成测试（需要数据库等外部依赖）
}
```

### 7.3 测试辅助函数

```go
// test/testutil/db.go
package testutil

import (
    "database/sql"
    "testing"
    _ "github.com/lib/pq"
)

// SetupTestDB 创建测试数据库
func SetupTestDB(t *testing.T) *sql.DB {
    t.Helper()
    db, err := sql.Open("postgres", "test-dsn")
    if err != nil {
        t.Fatal(err)
    }
    return db
}

// CleanupTestDB 清理测试数据库
func CleanupTestDB(t *testing.T, db *sql.DB) {
    t.Helper()
    // 清理逻辑
    db.Close()
}

// test/testutil/http.go
package testutil

import "net/http/httptest"

// SetupTestServer 创建测试服务器
func SetupTestServer(handler http.Handler) *httptest.Server {
    return httptest.NewServer(handler)
}
```

### 7.4 使用测试辅助函数

```go
package user

import (
    "testing"
    "yourproject/test/testutil"
)

func TestUserRepository(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTestDB(t, db)

    repo := NewRepository(db)
    // 测试逻辑
}
```


## 8. Makefile 测试目标

### 8.1 基础测试目标

```makefile
# Makefile
.PHONY: test test-cover test-race test-bench test-integration test-all

# 变量
GO := go
GOFLAGS := -v
COVERAGE_FILE := coverage.out

# 运行所有测试
test:
	$(GO) test $(GOFLAGS) ./...

# 运行测试并生成覆盖率
test-cover:
	$(GO) test $(GOFLAGS) -race -coverprofile=$(COVERAGE_FILE) -covermode=atomic ./...
	$(GO) tool cover -html=$(COVERAGE_FILE) -o coverage.html

# 竞态检测
test-race:
	$(GO) test $(GOFLAGS) -race ./...

# 基准测试
test-bench:
	$(GO) test $(GOFLAGS) -bench=. -benchmem ./...

# 快速测试（跳过慢速测试）
test-short:
	$(GO) test $(GOFLAGS) -short ./...

# 运行特定包的测试
test-unit:
	$(GO) test $(GOFLAGS) ./internal/...

# 集成测试（需要标签）
test-integration:
	$(GO) test $(GOFLAGS) -tags=integration ./...

# 运行所有测试类型
test-all: test test-race test-bench

# 检查覆盖率是否达标
test-coverage-check:
	$(GO) test -coverprofile=$(COVERAGE_FILE) ./...
	@$(GO) tool cover -func=$(COVERAGE_FILE) | grep total | \
		awk '{if ($$3+0 < 80) {print "Coverage below 80%:" $$3; exit 1}}'
```

### 8.2 使用 Makefile

```bash
# 运行所有测试
make test

# 运行测试并生成覆盖率报告
make test-cover

# 检查覆盖率是否达标
make test-coverage-check

# 运行竞态检测
make test-race

# 运行基准测试
make test-bench
```


## 9. SonarQube 覆盖率集成

### 9.1 快速开始

```bash
# 1. 生成覆盖率报告
go test -coverprofile=coverage.out -covermode=atomic ./...

# 2. 运行 SonarQube 扫描
sonar-scanner \
  -Dsonar.go.coverage.reportPaths=coverage.out \
  -Dsonar.sourceEncoding=UTF-8
```

### 9.2 完整配置示例

#### 命令行参数

```bash
# 基础配置
sonar-scanner \
  -Dsonar.projectKey=gotest \
  -Dsonar.host.url=https://sonarqube.example.com \
  -Dsonar.login=your-token \
  -Dsonar.go.coverage.reportPaths=coverage.out \
  -Dsonar.sourceEncoding=UTF-8

# 多个覆盖率文件（合并）
sonar-scanner \
  -Dsonar.go.coverage.reportPaths=coverage1.out,coverage2.out

# 排除不需要分析的文件
sonar-scanner \
  -Dsonar.go.coverage.reportPaths=coverage.out \
  -Dsonar.exclusions=**/*_test.go,**/vendor/**,**/mock/**

# 指定源码位置
sonar-scanner \
  -Dsonar.go.coverage.reportPaths=coverage.out \
  -Dsonar.sources=.
```

#### sonar-project.properties

```properties
# 项目配置
sonar.projectKey=gotest
sonar.projectName=Go Test Project
sonar.projectVersion=1.0

# 源码配置
sonar.sources=.
sonar.sourceEncoding=UTF-8

# Go 覆盖率配置（注意参数名顺序）
sonar.go.coverage.reportPaths=coverage.out

# 排除文件
sonar.exclusions=**/*_test.go,**/vendor/**,**/mock/**

# 测试报告（如果有）
sonar.go.tests.reportPaths=test-report.json
```

### 9.3 CI/CD 集成示例

#### GitHub Actions

```yaml
name: SonarQube Scan

on:
  push:
    branches: [ main, develop ]
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  sonarqube:
    name: SonarQube Scan
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # 重要：完整历史用于 blame

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.21'

      - name: Run tests with coverage
        run: |
          go test -coverprofile=coverage.out -covermode=atomic ./...

      - name: SonarQube Scan
        uses: sonarsource/sonarqube-scan-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
        with:
          args: >
            -Dsonar.go.coverage.reportPaths=coverage.out
            -Dsonar.sourceEncoding=UTF-8
```

#### GitLab CI

```yaml
sonarqube:
  stage: test
  image: golang:1.21

  script:
    - go test -coverprofile=coverage.out -covermode=atomic ./...
    - sonar-scanner
      -Dsonar.projectKey=${CI_PROJECT_NAME}
      -Dsonar.go.coverage.reportPaths=coverage.out
      -Dsonar.sourceEncoding=UTF-8

  only:
    - merge_requests
    - main
    - develop
```

#### Jenkins Pipeline

```groovy
pipeline {
    agent any

    tools {
        go '1.21'
    }

    environment {
        SONAR_TOKEN = credentials('sonarqube-token')
        SONAR_HOST_URL = 'https://sonarqube.example.com'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Test') {
            steps {
                sh 'go test -coverprofile=coverage.out -covermode=atomic ./...'
            }
        }

        stage('SonarQube Scan') {
            steps {
                script {
                    scannerHome = tool 'SonarQubeScanner'
                    withSonarQubeEnv('SonarQube') {
                        sh """
                            ${scannerHome}/bin/sonar-scanner \
                                -Dsonar.projectKey=${JOB_NAME} \
                                -Dsonar.go.coverage.reportPaths=coverage.out \
                                -Dsonar.sourceEncoding=UTF-8
                        """
                    }
                }
            }
        }
    }

    post {
        always {
            // 归并覆盖率报告
            archiveArtifacts artifacts: 'coverage.out', fingerprint: true
        }
        success {
            echo 'SonarQube analysis completed successfully!'
        }
        failure {
            echo 'Pipeline failed. Check logs for details.'
        }
    }
}
```

**使用说明**：

1. **配置 Jenkins 凭据**：
   ```groovy
   // 在 Jenkins 中添加 SonarQube Token
   // Manage Jenkins → Managed credentials → Add credentials
   // 类型: Secret text
   // ID: sonarqube-token
   ```

2. **配置 SonarQube Scanner 工具**：
   ```groovy
   // Manage Jenkins → Global Tool Configuration
   // SonarQube Scanner → Add SonarQube Scanner
   // Name: SonarQubeScanner
   ```

3. **配置 SonarQube Server**：
   ```groovy
   // Manage Jenkins → Configure System → SonarQube servers
   // Name: SonarQube
   // Server URL: https://sonarqube.example.com
   // Server authentication token: (使用上面的凭据)
   ```

**声明式 Pipeline（推荐）**：

```groovy
pipeline {
    agent any

    parameters {
        string(name: 'SONAR_PROJECT_KEY', defaultValue: 'gotest', description: 'SonarQube project key')
    }

    stages {
        stage('Build and Test') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        sh 'go test -v ./...'
                    }
                }
                stage('Coverage') {
                    steps {
                        sh 'go test -coverprofile=coverage.out -covermode=atomic ./...'
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                script {
                    scannerHome = tool 'SonarQubeScanner'
                    withSonarQubeEnv('SonarQube') {
                        sh "${scannerHome}/bin/sonar-scanner -Dsonar.projectKey=${params.SONAR_PROJECT_KEY}"
                    }
                }
                // 等待 Quality Gate 结果
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }
    }
}
```

### 9.4 验证配置

```bash
# 1. 确认覆盖率文件生成
go test -coverprofile=coverage.out ./...
ls -lh coverage.out

# 2. 查看覆盖率内容
go tool cover -func=coverage.out | tail -5

# 3. 本地测试 SonarQube 扫描（调试模式）
sonar-scanner -X \
  -Dsonar.go.coverage.reportPaths=coverage.out \
  -Dsonar.sourceEncoding=UTF-8

# 4. 检查 SonarQube 日志中的关键信息
# 查找： "Parsing coverage report"
# 查找： "Coverage information was not collected"
```

### 9.5 Makefile 集成

```makefile
.PHONY: test-coverage sonar-scan

# 生成覆盖率报告
test-coverage:
	go test -coverprofile=coverage.out -covermode=atomic ./...

# SonarQube 扫描
sonar-scan: test-coverage
	sonar-scanner \
		-Dsonar.go.coverage.reportPaths=coverage.out \
		-Dsonar.sourceEncoding=UTF-8

# 完整流程
ci: test-coverage sonar-scan
```

### 9.6 故障排查检查清单

- [ ] 使用正确的参数名：`sonar.go.coverage.reportPaths`
- [ ] 覆盖率文件路径正确且文件存在
- [ ] 使用 `atomic` 覆盖模式（CI 环境）
- [ ] 在项目根目录运行测试和扫描
- [ ] SonarQube Token 有正确权限
- [ ] 源码编码设置为 UTF-8
- [ ] 排除不必要的文件（测试、vendor）
- [ ] Git 历史完整（CI 环境）


## 10. 最佳实践

### 10.1 测试命名

```go
// ✅ 好的命名
func TestUserService_CreateUser_Success(t *testing.T) {}
func TestUserService_CreateUser_DuplicateEmail(t *testing.T) {}
func TestUserService_CreateUser_InvalidInput(t *testing.T) {}

// ❌ 不好的命名
func TestUserService1(t *testing.T) {}
func TestCreate(t *testing.T) {}
```

### 10.2 使用子测试

```go
func TestParseDuration(t *testing.T) {
    t.Run("valid input", func(t *testing.T) {
        t.Run("seconds", func(t *testing.T) {})
        t.Run("minutes", func(t *testing.T) {})
        t.Run("hours", func(t *testing.T) {})
    })
    t.Run("invalid input", func(t *testing.T) {})
}
```

### 10.3 测试隔离

```go
func TestWithSetupAndTeardown(t *testing.T) {
    // Setup
    db := setupTestDB(t)
    defer cleanupTestDB(t, db)

    // Test
    // ...
}

func setupTestDB(t *testing.T) *sql.DB {
    t.Helper() // 标记为辅助函数
    // 创建测试数据库
}

func cleanupTestDB(t *testing.T, db *sql.DB) {
    t.Helper()
    // 清理资源
}
```

### 10.4 测试超时

```go
func TestWithTimeout(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping test in short mode")
    }

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    // 测试逻辑
}
```

### 10.5 使用基准测试

```go
func BenchmarkToUpper(b *testing.B) {
    input := "hello world"
    for i := 0; i < b.N; i++ {
        ToUpper(input)
    }
}

// 运行基准测试
// go test -bench=. -benchmem
```

### 10.6 测试模糊化（Fuzzing）- Go 1.18+

```go
func FuzzParseDuration(f *testing.F) {
    // 添加种子语料库
    f.Add("5s")
    f.Add("10m")

    f.Fuzz(func(t *testing.T, input string) {
        d, err := ParseDuration(input)
        if err != nil {
            return // 无效输入是允许的
        }
        if d < 0 {
            t.Errorf("duration should not be negative: %v", d)
        }
    })
}

// 运行模糊化测试
// go test -fuzz=FuzzParseDuration
```

### 10.7 环境变量控制

```go
func TestIntegration(t *testing.T) {
    if os.Getenv("INTEGRATION_TEST") != "true" {
        t.Skip("set INTEGRATION_TEST=true to run integration tests")
    }
    // 集成测试逻辑
}
```

### 10.8 使用 testify 断言

```go
import "github.com/stretchr/testify/assert"

func TestWithTestify(t *testing.T) {
    assert.Equal(t, expected, actual)
    assert.NoError(t, err)
    assert.Nil(t, obj)
    assert.True(t, condition)
    assert.Contains(t, slice, element)
    assert.Len(t, slice, 3)
}
```


## 11. 常用工具和库

### 11.1 testify - 断言和 Mock

```bash
go get github.com/stretchr/testify
```

```go
import "github.com/stretchr/testify/assert"

func TestWithTestify(t *testing.T) {
    assert.Equal(t, expected, actual)
    assert.NoError(t, err)
    assert.Nil(t, obj)
    assert.True(t, condition)
    assert.Contains(t, slice, element)
    assert.Len(t, slice, 3)
}
```

### 11.2 gomock - Mock 生成

```bash
go install github.com/golang/mock/mockgen@latest
```

```bash
# 生成 mock
mockgen -source=user.go -destination=mock_user.go
```

### 11.3 go-sqlmock - SQL Mock

```bash
go get github.com/DATA-DOG/go-sqlmock
```

```go
db, mock, err := sqlmock.New()
assert.NoError(t, err)
defer db.Close()

rows := sqlmock.NewRows([]string{"id", "name"}).
    AddRow(1, "Alice")

mock.ExpectQuery("SELECT \\* FROM users").
    WillReturnRows(rows)

// 使用 db 进行测试
```

### 11.4 httptest - HTTP 测试

```go
// 标准库内置，无需安装
import "net/http/httptest"
```


## 12. 快速参考

### 12.1 常用测试命令

```bash
# 基础测试
go test                          # 当前包
go test ./...                    # 所有包
go test -v ./...                 # 详细输出
go test -run TestFoo ./...       # 运行特定测试

# 覆盖率
go test -cover ./...
go test -coverprofile=c.out ./...
go tool cover -html=c.out

# 性能测试
go test -race ./...              # 竞态检测
go test -bench=. ./...           # 基准测试
go test -cpuprofile=cpu.out ./... # CPU 性能分析

# 其他
go test -short ./...             # 跳过耗时测试
go test -count=1 ./...           # 禁用缓存
go test -timeout 30s ./...       # 设置超时
```

### 12.2 测试标志

| 标志 | 说明 |
|------|------|
| `-v` | 详细输出 |
| `-run` | 运行匹配的测试 |
| `-cover` | 显示覆盖率 |
| `-race` | 竞态检测 |
| `-short` | 跳过耗时测试 |
| `-parallel` | 并行测试数 |
| `-count` | 运行次数 |

### 12.3 测试函数签名

| 类型 | 签名 | 用途 |
|------|------|------|
| 单元测试 | `func TestXxx(t *testing.T)` | 测试功能 |
| 基准测试 | `func BenchmarkXxx(b *testing.B)` | 测试性能 |
| 示例测试 | `func ExampleXxx()` | 文档示例 |
| 模糊测试 | `func FuzzXxx(f *testing.F)` | 随机输入测试 |


## 13. 完整示例

### 13.1 完整的测试文件

```go
// utils/string_test.go
package utils

import (
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestToUpper(t *testing.T) {
    tests := []struct {
        name     string
        input    string
        expected string
    }{
        {
            name:     "lowercase letters",
            input:    "hello",
            expected: "HELLO",
        },
        {
            name:     "mixed case",
            input:    "HeLLo",
            expected: "HELLO",
        },
        {
            name:     "empty string",
            input:    "",
            expected: "",
        },
        {
            name:     "with numbers",
            input:    "hello123",
            expected: "HELLO123",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := ToUpper(tt.input)
            assert.Equal(t, tt.expected, result)
        })
    }
}

func TestToUpper_WithSpecialChars(t *testing.T) {
    // 使用 require 遇到错误立即停止
    require.NotNil(t, ToUpper)

    result := ToUpper("hello@world!")
    assert.Equal(t, "HELLO@WORLD!", result)
}
```


## 14. 总结

### 14.1 单元测试 Checklist

- [ ] 测试文件以 `_test.go` 结尾
- [ ] 测试函数以 `Test` 开头
- [ ] 使用表驱动测试覆盖多个场景
- [ ] 测试命名清晰描述测试意图
- [ ] 使用 `t.Helper()` 标记辅助函数
- [ ] 测试之间相互独立
- [ ] 使用 Mock 隔离外部依赖
- [ ] 保持测试代码简洁
- [ ] 目标覆盖率 ≥ 80%
- [ ] 定期运行 `go test -race`

### 14.2 学习资源

- [Go 官方测试文档](https://golang.org/pkg/testing/)
- [Testify 文档](https://github.com/stretchr/testify)
- [Effective Go: Testing](https://golang.org/doc/effective_go#testing)
- [Go Wiki: Table Driven Tests](https://github.com/golang/go/wiki/TableDrivenTests)


## 附录

### A. 常见错误

```go
// ❌ 错误：没有检查错误
result, _ := SomeFunction()

// ✅ 正确：检查错误
result, err := SomeFunction()
if err != nil {
    t.Fatalf("unexpected error: %v", err)
}
```

### B. 性能测试技巧

```go
func BenchmarkParallel(b *testing.B) {
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            // 并行执行的测试代码
        }
    })
}
```

### C. 测试覆盖率命令

```bash
# 查看特定包的覆盖率
go test -coverprofile=coverage.out ./path/to/package
go tool cover -func=coverage.out

# 生成 HTML 报告
go tool cover -html=coverage.out -o coverage.html
open coverage.html
```
