export interface CurrentUser {
    id: number;
    email: string;
    displayName: string;
    roles: string[];
}

interface LoginResponse {
    token: string;
}

export async function login(
    email: string,
    password: string,
): Promise<string> {
    const response = await fetch("/api/login", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    })

    if (response.status === 401) {
        throw new Error("Email ou mot de passe incorrect.");
    }

    if (!response.ok) {
        throw new Error(
            `Impossible de se connecter (HTTP ${response.status}).`,
        );
    }

    const data: LoginResponse = await response.json();

    return data.token;
}

export async function getCurrentUser(
    token: string,
    signal?: AbortSignal,
): Promise<CurrentUser> {
    const response = await fetch("/api/me", {
        headers: {
            Accept: "application/json",
            "Authorization": `Bearer ${token}`,
        },
        signal,
    })

    if (response.status === 401) {
        throw new Error("Votre session a expiré. Veuillez vous reconnecter.");
    }

    if (!response.ok) {
        throw new Error(
            `Impossible de charger le profil (HTTP ${response.status}).`,
        );
    }

    return response.json();
}
