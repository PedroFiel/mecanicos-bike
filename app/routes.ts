import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
    layout("layouts/layout.tsx", [
        index("routes/home.tsx"),
        route("dashboard", "routes/dashboard.tsx"),
        route("account", "routes/account.tsx"),
        route("settings", "routes/settings.tsx"),
        route("clients", "routes/clients.tsx"),
        route("clients/new", "routes/clients.new.tsx"),
        route("clients/:clientId", "routes/clients.$clientId.tsx"),
    ]),
    route("login", "routes/login.tsx"),
    route("register", "routes/signup.tsx"),
    route("logout", "routes/logout.tsx"),
] satisfies RouteConfig;
