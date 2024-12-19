import { pathsToModuleNameMapper } from "ts-jest";

const paths = {
    "@/*": ["./src/*"]
};

const jestConfig = {
    preset: "ts-jest",
    rootDir: "../../",
    moduleDirectories: ["node_modules", "<rootDir>"],
    moduleNameMapper: pathsToModuleNameMapper(paths, { prefix: "<rootDir>/" }),
    testEnvironment: "node"
}

export default jestConfig;
