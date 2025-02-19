import type { Config } from '@jest/types';
import { pathsToModuleNameMapper } from 'ts-jest';
import { compilerOptions } from './tsconfig.json';

/**
 * Jest configuration for backend microservices testing
 * @version ts-jest: ^29.0.0
 * @version @types/jest: ^29.0.0
 */
const config: Config.InitialOptions = {
  // Use ts-jest for TypeScript preprocessing
  preset: 'ts-jest',
  
  // Set Node.js as test environment
  testEnvironment: 'node',
  
  // Root directory for tests
  roots: ['<rootDir>/src'],
  
  // Test file patterns
  testMatch: [
    '**/*.test.ts',
    '**/*.spec.ts'
  ],
  
  // Module name mapping from tsconfig paths
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/src/'
  }),
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/*.d.ts$'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Test setup file
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  
  // Additional configuration
  verbose: true,
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true,
  
  // Transform configuration
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json'
      }
    ]
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Global settings
  globals: {
    'ts-jest': {
      isolatedModules: true,
      diagnostics: {
        warnOnly: true
      }
    }
  }
};

export default config;