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
        route("clients/:clientId/edit", "routes/clients.$clientId.edit.tsx"),
        route("bikes/new", "routes/bikes.new.tsx"),
        route("bikes/:bikeId", "routes/bikes.$bikeId.tsx"),
        route("bikes/:bikeId/edit", "routes/bikes.$bikeId.edit.tsx"),
        route("appointments/new", "routes/appointments.new.tsx"),
        route("appointments/:appointmentId", "routes/appointments.$appointmentId.tsx"),
        route("appointments/:appointmentId/edit", "routes/appointments.$appointmentId.edit.tsx"),
    ]),
    route("login", "routes/login.tsx"),
    route("register", "routes/signup.tsx"),
    route("logout", "routes/logout.tsx"),
] satisfies RouteConfig;
