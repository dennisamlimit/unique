import { AccountRepository } from "../accounts/account-repository.js";
import { BankRepository } from "./bank-repository.js";
import { PhoneService } from "../phone/phone-service.js";
import { getVar, setVar } from "../../runtime/helpers.js";
import { emitClient } from "../../runtime/helpers.js";

export class BankingService {
    constructor(
        private accountRepo: AccountRepository,
        private bankRepo: BankRepository,
        private phoneService: PhoneService
    ) {
        console.log("[unique][Banking] SERVICE INITIALIZING");
        this.registerEvents();
    }

    private registerEvents() {
        mp.events.add("server:banking:open", (player: any) => {
            void this.openBanking(player);
        });

        mp.events.add("server:banking:deposit", (player: any, amount: number) => {
            void this.deposit(player, Number(amount));
        });

        mp.events.add("server:banking:withdraw", (player: any, amount: number) => {
            void this.withdraw(player, Number(amount));
        });

        mp.events.add("server:banking:transfer", (player: any, targetIban: string, amount: number, label: string) => {
            void this.transfer(player, targetIban, Number(amount), String(label));
        });
    }

    async ensureIban(player: any) {
        const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
        if (accountId <= 0) return null;

        let account = await this.accountRepo.getById(accountId);
        if (!account) return null;

        if (!account.iban) {
            const newIban = await this.generateUniqueIban();
            account = await this.accountRepo.updateIban(accountId, newIban);
            console.log(`[Banking] Generated new IBAN for ${player.name}: ${newIban}`);
        }

        return account?.iban || null;
    }

    private async generateUniqueIban(): Promise<string> {
        let unique = false;
        let iban = "";
        while (!unique) {
            const p1 = Math.floor(1000 + Math.random() * 9000);
            const p2 = Math.floor(1000 + Math.random() * 9000);
            const p3 = Math.floor(1000 + Math.random() * 9000);
            iban = `FL-${p1}-${p2}-${p3}`;
            const existing = await this.accountRepo.getByIban(iban);
            if (!existing) unique = true;
        }
        return iban;
    }

    async openBanking(player: any) {
        const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
        if (accountId <= 0) return;

        const iban = await this.ensureIban(player);
        const account = await this.accountRepo.getById(accountId);
        if (!account) return;

        const history = await this.bankRepo.getHistory(accountId);
        const stats = await this.bankRepo.getStats(accountId);
        const analytics = await this.bankRepo.getWeeklyAnalytics(accountId);

        emitClient(player, "client:banking:setData", JSON.stringify({
            iban: account.iban,
            ownerName: `${account.firstName} ${account.lastName}`,
            balance: account.bankCash,
            cash: account.cash,
            history,
            stats,
            analytics
        }));
    }

    async deposit(player: any, amount: number) {
        if (amount <= 0) return;
        const cash = Number(getVar(player, "CASH", 0));
        if (cash < amount) return player.outputChatBox("!{red}Nicht genug Bargeld.");

        const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
        const account = await this.accountRepo.getById(accountId);
        if (!account) return;

        const newCash = cash - amount;
        const newBank = account.bankCash + amount;

        await this.accountRepo.updateState(accountId, { cash: newCash, bankCash: newBank });
        setVar(player, "CASH", newCash);
        setVar(player, "BANK_CASH", newBank);

        await this.bankRepo.logTransaction({
            senderAccountId: accountId,
            recipientAccountId: accountId,
            senderName: player.name,
            recipientName: "Mein Konto",
            amount,
            type: 'deposit',
            label: 'Einzahlung'
        });

        this.openBanking(player);
        player.outputChatBox(`!{green}$${amount} eingezahlt.`);
    }

    async withdraw(player: any, amount: number) {
        if (amount <= 0) return;
        const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
        const account = await this.accountRepo.getById(accountId);
        if (!account || account.bankCash < amount) return player.outputChatBox("!{red}Nicht genug Geld auf der Bank.");

        const cash = Number(getVar(player, "CASH", 0));
        const newCash = cash + amount;
        const newBank = account.bankCash - amount;

        await this.accountRepo.updateState(accountId, { cash: newCash, bankCash: newBank });
        setVar(player, "CASH", newCash);
        setVar(player, "BANK_CASH", newBank);

        await this.bankRepo.logTransaction({
            senderAccountId: accountId,
            recipientAccountId: accountId,
            senderName: "Mein Konto",
            recipientName: player.name,
            amount,
            type: 'withdraw',
            label: 'Auszahlung'
        });

        this.openBanking(player);
        player.outputChatBox(`!{green}$${amount} ausgezahlt.`);
    }

    async transfer(player: any, targetIban: string, amount: number, label: string) {
        if (amount <= 0) return;
        const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
        const account = await this.accountRepo.getById(accountId);
        if (!account || account.bankCash < amount) return player.outputChatBox("!{red}Nicht genug Geld fuer die Ueberweisung.");

        const targetAccount = await this.accountRepo.getByIban(targetIban);
        if (!targetAccount) return player.outputChatBox("!{red}IBAN nicht gefunden.");
        if (targetAccount.accountId === accountId) return player.outputChatBox("!{red}Du kannst dir nicht selbst Geld ueberweisen.");

        // Sender update
        const newSenderBank = account.bankCash - amount;
        await this.accountRepo.updateState(accountId, { bankCash: newSenderBank });
        setVar(player, "BANK_CASH", newSenderBank);

        // Recipient update
        const newRecipientBank = targetAccount.bankCash + amount;
        await this.accountRepo.updateState(targetAccount.accountId, { bankCash: newRecipientBank });
        
        // Update online recipient variables if online
        const allPlayers = (mp.players as any).toArray();
        const onlineRecipient = allPlayers.find((p: any) => Number(getVar(p, "ACCOUNT_ID", 0)) === targetAccount.accountId);
        if (onlineRecipient) {
            setVar(onlineRecipient, "BANK_CASH", newRecipientBank);
            this.phoneService.sendNotification(onlineRecipient, {
                title: "Bank",
                content: `Eingang: $${amount} von ${player.name}.`,
                icon: "fas fa-university",
                app: "Wallet"
            });
        }

        await this.bankRepo.logTransaction({
            senderAccountId: accountId,
            recipientAccountId: targetAccount.accountId,
            senderName: player.name,
            recipientName: `${targetAccount.firstName} ${targetAccount.lastName}`,
            amount,
            type: 'transfer',
            label: label || 'Ueberweisung'
        });

        this.openBanking(player);
        player.outputChatBox(`!{green}$${amount} an ${targetAccount.firstName} ${targetAccount.lastName} ueberwiesen.`);
    }
}
