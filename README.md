# 2D Gaussian Blur with WebGPU

This repository showcases a 2D Gaussian Blur filter implemented using WebGPU, leveraging the power of modern GPUs for efficient image processing.

For a detailed explanation of the implementation, check out the blog series: [Gaussian Blur](https://www.danilosdev.blog/it/blog/webgpu-blur).

## Prerequisites

- Node.js (recommended version: 16+)
- pnpm (can be installed via `npm install -g pnpm`)

## Features

- Efficient 2D Gaussian Blur filter utilizing WebGPU, written in TypeScript, and built with Vite for fast development.
- Browser-based tests with QUnit to verify functionality in the browser environment.
- Node.js-based tests with Jest for backend logic testing and validation.

## How to Build and Run

1. Install dependencies using pnpm:
    ```bash
    pnpm install
    ```

2. Build the project:
    ```bash
    pnpm build
    ```

3. Preview the application:
    ```bash
    pnpm preview
    ```

4. Open the application in your browser.

## Running Tests

### Browser-based Tests (QUnit)

To run the tests in the browser, run the following command:
```bash
pnpm test:browser
```

This will start a development server and open the tests in the browser using QUnit.

### Node.js-based Tests (Jest)

To run Node.js-based tests with Jest, use the following command:
```bash
pnpm test:node
```

This will run the Jest test suite in a Node.js environment.
