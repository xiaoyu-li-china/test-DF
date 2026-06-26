interface TestResult {
    name: string;
    passed: boolean;
    message: string;
    details?: Record<string, any>;
}
declare class IntegrationTest {
    private results;
    private storeId;
    private storeName;
    private inspectionId;
    constructor();
    private assert;
    private logStep;
    run(): Promise<{
        passed: number;
        failed: number;
        results: TestResult[];
    }>;
}
declare function runTests(): Promise<void>;
export { IntegrationTest, runTests };
