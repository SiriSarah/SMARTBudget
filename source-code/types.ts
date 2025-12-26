/**
 * Core type definitions for security components.
 */

export type TransactionType = 'income' | 'expense';

export interface Transaction {
    type: TransactionType;
    amount: number;
    category: string;
    date: string;
}

export type BudgetPeriod = 'daily' | 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'yearly';

export interface Budget {
    category: string;
    limit: number;
    period: BudgetPeriod;
}

export interface Goal {
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
}

export type DebtType = 'credit-card' | 'loan' | 'mortgage' | 'other';

export interface Debt {
    type: DebtType;
    balance: number;
    interestRate: number;
    minimumPayment: number;
}

export interface SanitizedTransaction {
    type: 'income' | 'expense';
    roundedAmount: number;
    category: string;
    period: string;
    weekOfPeriod?: number;
}

export interface SanitizedFinancialSummary {
    period: string;
    totalIncome: number;
    totalExpenses: number;
    netSavings: number;
    spendingByCategory: Record<string, number>;
    incomeByCategory: Record<string, number>;
    transactionCount: number;
}

export interface SanitizedBudget {
    category: string;
    limit: number;
    spent: number;
    percentUsed: number;
    period: BudgetPeriod;
}

export interface SanitizedGoal {
    label: string;
    targetAmount: number;
    currentAmount: number;
    percentComplete: number;
    monthsRemaining: number;
}

export interface SanitizedDebt {
    type: DebtType;
    balance: number;
    interestRate: number;
    minimumPayment: number;
}

export interface SanitizedAIContext {
    currentPeriod: SanitizedFinancialSummary;
    previousPeriod?: SanitizedFinancialSummary;
    recentTransactions: SanitizedTransaction[];
    budgets: SanitizedBudget[];
    goals: SanitizedGoal[];
    debts: SanitizedDebt[];
    currencySymbol: string;
}

export const FORBIDDEN_FIELDS = [
    'id',
    'description',
    'note',
    'notes',
    'importHash',
    'recurringTransactionId',
    'linkedGoalId',
    'linkedDebtId',
    'createdAt',
    'name',
    'email',
    'accountName',
    'merchantName',
] as const;

export type ForbiddenField = typeof FORBIDDEN_FIELDS[number];

export interface SyncConfig {
    enabled: boolean;
    endpointUrl?: string;
    apiKey?: string;
}

export interface SyncManifest {
    lastModified: number;
    deviceId: string;
    version: string;
}
