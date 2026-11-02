export function getTokenExpiration(token: string): number {
    try {
        const parts = token.split(".");

        if (parts.length !== 3) {
            throw new Error();
        }

        const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const paddedPayload = payload.padEnd(
            Math.ceil(payload.length / 4) * 4,
            "=",
        );

        const data: unknown = JSON.parse(atob(paddedPayload));

        if (
            typeof data !== "object" ||
            data === null ||
            !("exp" in data) ||
            typeof data.exp !== "number" ||
            !Number.isFinite(data.exp) ||
            !Number.isFinite(data.exp * 1000)
        ) {
            throw new Error();
        }

        return data.exp * 1000;
    } catch {
        throw new Error("Le serveur a renvoyé un token invalide.");
    }
}
