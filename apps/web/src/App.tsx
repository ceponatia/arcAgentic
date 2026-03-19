import React from "react";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./routes/routeTree.js";
import { RequireSignIn } from "./shared/auth/RequireSignIn.js";

export const App: React.FC = () => {
  return (
    <RequireSignIn>
      <RouterProvider router={router} />
    </RequireSignIn>
  );
};
