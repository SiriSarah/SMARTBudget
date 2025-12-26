/**
 * AI Data Sanitization Service.
 * Provides functions to sanitize data before sending to AI providers.
 */

import type {
    Transaction,
    Budget,
    Goal,
    Debt,
    SanitizedTransaction,
    SanitizedFinancialSummary,
    SanitizedBudget,
    SanitizedGoal,
    SanitizedDebt,
    SanitizedAIContext,
    ForbiddenField,
} from '../types.ts';
import { FORBIDDEN_FIELDS } from '../types.ts';
import { parseLocalDate } from './dateUtils.ts';

/**
 * Round an amount to protect privacy.
 */
export function roundAmount(amount: number): number {
    const absAmount = Math.abs(amount);
    let rounded: number;

    if (absAmount < 100) {
        rounded = Math.round(absAmount / 5) * 5;
    } else if (absAmount < 1000) {
        rounded = Math.round(absAmount / 10) * 10;
    } else {
        rounded = Math.round(absAmount / 50) * 50;
    }

    return amount < 0 ? -rounded : rounded;
}

export function dateToPeriod(dateString: string): string {
    const date = parseLocalDate(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

export function getWeekOfMonth(dateString: string): number {
    const date = parseLocalDate(dateString);
    const dayOfMonth = date.getDate();
    return Math.ceil(dayOfMonth / 7);
}

export function sanitizeTransaction(transaction: Transaction): SanitizedTransaction {
    return {
        type: transaction.type,
        roundedAmount: roundAmount(transaction.amount),
        category: transaction.category,
        period: dateToPeriod(transaction.date),
        weekOfPeriod: getWeekOfMonth(transaction.date),
    };
}

export function sanitizeTransactions(transactions: Transaction[]): SanitizedTransaction[] {
    return transactions.map(sanitizeTransaction);
}

export function generateFinancialSummary(
    transactions: Transaction[],
    period: string
): SanitizedFinancialSummary {
    const periodTransactions = transactions.filter(t => dateToPeriod(t.date) === period);

    const income = periodTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const expenses = periodTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const spendingByCategory: Record<string, number> = {};
    const incomeByCategory: Record<string, number> = {};

    periodTransactions.forEach(t => {
        if (t.type === 'expense') {
            spendingByCategory[t.category] = (spendingByCategory[t.category] || 0) + t.amount;
        } else {
            incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
        }
    });

    Object.keys(spendingByCategory).forEach(cat => {
        spendingByCategory[cat] = roundAmount(spendingByCategory[cat]);
    });
    Object.keys(incomeByCategory).forEach(cat => {
        incomeByCategory[cat] = roundAmount(incomeByCategory[cat]);
    });

    return {
        period,
        totalIncome: roundAmount(income),
        totalExpenses: roundAmount(expenses),
        netSavings: roundAmount(income - expenses),
        spendingByCategory,
        incomeByCategory,
        transactionCount: periodTransactions.length,
    };
}

export function sanitizeBudget(budget: Budget, spent: number): SanitizedBudget {
    const percentUsed = budget.limit > 0 ? Math.round((spent / budget.limit) * 100) : 0;

    return {
        category: budget.category,
        limit: roundAmount(budget.limit),
        spent: roundAmount(spent),
        percentUsed,
        period: budget.period,
    };
}

export function sanitizeGoal(goal: Goal, index: number): SanitizedGoal {
    const percentComplete = goal.targetAmount > 0
        ? Math.round((goal.currentAmount / goal.targetAmount) * 100)
        : 0;

    const targetDate = parseLocalDate(goal.targetDate);
    const now = new Date();
    const monthsRemaining = Math.max(0,
        (targetDate.getFullYear() - now.getFullYear()) * 12 +
        (targetDate.getMonth() - now.getMonth())
    );

    return {
        label: `Goal ${index + 1}`,
        targetAmount: roundAmount(goal.targetAmount),
        currentAmount: roundAmount(goal.currentAmount),
        percentComplete,
        monthsRemaining,
    };
}

export function sanitizeDebt(debt: Debt): SanitizedDebt {
    return {
        type: debt.type,
        balance: roundAmount(debt.balance),
        interestRate: debt.interestRate,
        minimumPayment: roundAmount(debt.minimumPayment),
    };
}

export function sanitizePromptContext(
    transactions: Transaction[],
    budgets: Budget[],
    goals: Goal[],
    debts: Debt[],
    currencySymbol: string
): SanitizedAIContext {
    const now = new Date();
    const currentPeriod = dateToPeriod(now.toISOString());

    const prevMonth = new Date(now);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const previousPeriod = dateToPeriod(prevMonth.toISOString());

    const currentMonthTransactions = transactions.filter(
        t => dateToPeriod(t.date) === currentPeriod
    );

    const spentByCategory: Record<string, number> = {};
    currentMonthTransactions.forEach(t => {
        if (t.type === 'expense') {
            spentByCategory[t.category] = (spentByCategory[t.category] || 0) + t.amount;
        }
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentTransactions = transactions.filter(
        t => parseLocalDate(t.date) >= thirtyDaysAgo
    );

    return {
        currentPeriod: generateFinancialSummary(transactions, currentPeriod),
        previousPeriod: generateFinancialSummary(transactions, previousPeriod),
        recentTransactions: sanitizeTransactions(recentTransactions),
        budgets: budgets.map(b => sanitizeBudget(b, spentByCategory[b.category] || 0)),
        goals: goals.map((g, i) => sanitizeGoal(g, i)),
        debts: debts.map(sanitizeDebt),
        currencySymbol,
    };
}

/**
 * Runtime validation to ensure no forbidden fields are present.
 */
export function validateSanitizedData(data: unknown): void {
    if (data === null || data === undefined || typeof data !== 'object') {
        return;
    }

    if (Array.isArray(data)) {
        data.forEach(item => validateSanitizedData(item));
        return;
    }

    const obj = data as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
        if (FORBIDDEN_FIELDS.includes(key as ForbiddenField)) {
            throw new Error(`Sanitization breach: Forbidden field "${key}" detected`);
        }
        validateSanitizedData(obj[key]);
    }
}

export function formatContextForPrompt(context: SanitizedAIContext): string {
    const lines: string[] = [];

    const curr = context.currentPeriod;
    lines.push(`=== Financial Summary (${curr.period}) ===`);
    lines.push(`Income: ${context.currencySymbol}${curr.totalIncome.toLocaleString()}`);
    lines.push(`Expenses: ${context.currencySymbol}${curr.totalExpenses.toLocaleString()}`);
    lines.push(`Net: ${context.currencySymbol}${curr.netSavings.toLocaleString()}`);
    lines.push(`Transactions: ${curr.transactionCount}`);

    if (Object.keys(curr.spendingByCategory).length > 0) {
        lines.push(`\nSpending by Category:`);
        (Object.entries(curr.spendingByCategory) as [string, number][])
            .sort((a, b) => b[1] - a[1])
            .forEach(([cat, amount]) => {
                lines.push(`  - ${cat}: ${context.currencySymbol}${amount.toLocaleString()}`);
            });
    }

    if (context.budgets.length > 0) {
        lines.push(`\n=== Budget Status ===`);
        context.budgets.forEach((b: SanitizedBudget) => {
            const status = b.percentUsed >= 100 ? '⚠️ OVER' :
                b.percentUsed >= 80 ? '⚠️ WARNING' : '✓';
            lines.push(`  ${b.category}: ${b.percentUsed}% used (${context.currencySymbol}${b.spent}/${context.currencySymbol}${b.limit}) ${status}`);
        });
    }

    if (context.goals.length > 0) {
        lines.push(`\n=== Goals ===`);
        context.goals.forEach((g: SanitizedGoal) => {
            lines.push(`  ${g.label}: ${g.percentComplete}% complete, ${g.monthsRemaining} months remaining`);
        });
    }

    if (context.debts.length > 0) {
        lines.push(`\n=== Debts ===`);
        context.debts.forEach((d: SanitizedDebt) => {
            lines.push(`  ${d.type}: ${context.currencySymbol}${d.balance.toLocaleString()} at ${d.interestRate}% APR`);
        });
    }

    return lines.join('\n');
}
