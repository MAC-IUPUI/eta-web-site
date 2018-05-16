export function getParameterByName(name: string) {
    const match = RegExp("[?&]" + name + "=([^&]*)").exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, " "));
}

export function getAllParameters(): {[key: string]: string} {
    const tokens: string[] = window.location.search.substring(1).split("&");
    const params: {[key: string]: string} = {};
    for (let i = 0; i < tokens.length; i++) {
        const parts: string[] = tokens[i].split("=");
        params[parts[0]] = parts[1];
    }
    return params;
}

export function getPath(): string {
    return window.location.pathname.split("/").pop();
}
