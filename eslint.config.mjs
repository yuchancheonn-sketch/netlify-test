import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    /*
     * 밑줄로 시작하는 인자는 "일부러 안 쓴다"는 뜻으로 봅니다 (2026-09-22).
     *
     * 값을 안 보고 늘 같은 답을 내는 함수가 있습니다 — lib/cohort.ts의
     * hasYouthMembers·canAddMembers가 그렇습니다. 인자를 지우면 부르는 쪽을
     * 전부 고쳐야 하고, 나중에 되돌릴 때 다시 넣어야 합니다. 그래서 인자는
     * 이름만 _로 바꿔 남겨 두고, 린트에는 그 표시를 알려 줍니다.
     * (타입스크립트의 noUnusedParameters도 같은 규칙을 씁니다.)
     */
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
