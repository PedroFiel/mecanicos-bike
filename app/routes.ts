import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
    layout("layouts/layout.tsx", [
        index("routes/home.tsx"),
        route("dashboard", "routes/dashboard.tsx"),
    ]),
    route("login", "routes/login.tsx"),
    route("register", "routes/signup.tsx"),
    route("logout", "routes/logout.tsx"),
] satisfies RouteConfig;
