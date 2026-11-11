import readline from "readline/promises";
import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function main() {
    const password = await rl.question("Digite a nova senha de administrador: ");
    rl.close();

    if (!password || password.trim().length === 0) {
        console.log("Erro: A senha não pode ser vazia.");
        process.exit(1);
    }

    const hash = createHash("sha256").update(password.trim()).digest("hex");
    const envPath = path.join(process.cwd(), ".env");

    let envContent = "";
    try {
        envContent = await fs.readFile(envPath, "utf-8");
    } catch {
        envContent = "";
    }

    // Remove qualquer configuração legada de senha em texto plano ou auth_secret
    envContent = envContent
        .replace(/^ADMIN_PASSWORD=.*$/gm, "")
        .replace(/^AUTH_SECRET=.*$/gm, "");

    const regex = /^ADMIN_PASSWORD_HASH=.*$/m;
    if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `ADMIN_PASSWORD_HASH="${hash}"`);
    } else {
        const trimmed = envContent.trim();
        envContent = trimmed ? `${trimmed}\nADMIN_PASSWORD_HASH="${hash}"\n` : `ADMIN_PASSWORD_HASH="${hash}"\n`;
    }

    await fs.writeFile(envPath, envContent, "utf-8");
    console.log("\n✓ Senha criptografada e salva com sucesso no .env!");
}

main();

