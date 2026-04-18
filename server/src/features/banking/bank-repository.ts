import { getPool } from "../../infrastructure/database.js";
import { DatabaseError } from "../../shared/errors.js";

export type BankTransaction = {
    transactionId: number;
    senderAccountId: number | null;
    recipientAccountId: number | null;
    senderName: string | null;
    recipientName: string | null;
    amount: number;
    type: 'deposit' | 'withdraw' | 'transfer';
    label: string | null;
    createdAt: Date;
};

export class BankRepository {
    async logTransaction(data: Omit<BankTransaction, 'transactionId' | 'createdAt'>) {
        try {
            const result = await getPool().query(
                `INSERT INTO bank_transactions 
                (sender_account_id, recipient_account_id, sender_name, recipient_name, amount, type, label) 
                VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [data.senderAccountId, data.recipientAccountId, data.senderName, data.recipientName, data.amount, data.type, data.label]
            );
            return result.rows[0];
        } catch (cause) {
            throw new DatabaseError("logTransaction failed", cause);
        }
    }

    async getHistory(accountId: number, limit: number = 20) {
        try {
            const result = await getPool().query(
                `SELECT * FROM bank_transactions 
                WHERE sender_account_id = $1 OR recipient_account_id = $1 
                ORDER BY created_at DESC LIMIT $2`,
                [accountId, limit]
            );
            return result.rows.map(row => this.mapRow(row));
        } catch (cause) {
            throw new DatabaseError("getHistory failed", cause);
        }
    }

    async getStats(accountId: number) {
        try {
            const result = await getPool().query(
                `SELECT 
                    SUM(CASE WHEN recipient_account_id = $1 AND type != 'withdraw' THEN amount ELSE 0 END) as total_income,
                    SUM(CASE WHEN sender_account_id = $1 AND type != 'deposit' THEN amount ELSE 0 END) as total_outcome
                FROM bank_transactions 
                WHERE sender_account_id = $1 OR recipient_account_id = $1`,
                [accountId]
            );
            const row = result.rows[0];
            return {
                totalIncome: parseInt(row.total_income || "0"),
                totalOutcome: parseInt(row.total_outcome || "0")
            };
        } catch (cause) {
            throw new DatabaseError("getStats failed", cause);
        }
    }

    async getWeeklyAnalytics(accountId: number) {
        try {
            const result = await getPool().query(
                `SELECT 
                    TO_CHAR(created_at, 'DY') as day,
                    SUM(CASE WHEN recipient_account_id = $1 AND type != 'withdraw' THEN amount ELSE 0 END) as income,
                    SUM(CASE WHEN sender_account_id = $1 AND type != 'deposit' THEN amount ELSE 0 END) as outcome
                FROM bank_transactions 
                WHERE (sender_account_id = $1 OR recipient_account_id = $1) 
                  AND created_at >= NOW() - INTERVAL '7 days'
                GROUP BY day, DATE_TRUNC('day', created_at)
                ORDER BY DATE_TRUNC('day', created_at) ASC`,
                [accountId]
            );
            return result.rows;
        } catch (cause) {
            throw new DatabaseError("getWeeklyAnalytics failed", cause);
        }
    }

    private mapRow(row: any): BankTransaction {
        return {
            transactionId: row.transaction_id,
            senderAccountId: row.sender_account_id,
            recipientAccountId: row.recipient_account_id,
            senderName: row.sender_name,
            recipientName: row.recipient_name,
            amount: row.amount,
            type: row.type,
            label: row.label,
            createdAt: row.created_at
        };
    }
}
