import React from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  NavButton,
  HomeIcon,
  UsersIcon,
  GlobeIcon,
  MapPinIcon,
  TagIcon,
  BoxIcon,
  ChatIcon,
} from "./ShellComponents.js";

interface NavItemsProps {
  onItemClick?: () => void;
}

/**
 * Shared navigation items used in both mobile and desktop menus.
 */
export const NavItems: React.FC<NavItemsProps> = ({ onItemClick }) => {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <>
      <NavButton
        icon={<HomeIcon className="w-5 h-5" />}
        label="Home"
        active={pathname === "/"}
        onClick={() => {
          void navigate({ to: "/" });
          onItemClick?.();
        }}
      />
      <NavButton
        icon={<UsersIcon className="w-5 h-5" />}
        label="Characters"
        active={
          pathname === "/characters" || pathname.startsWith("/characters/")
        }
        onClick={() => {
          void navigate({ to: "/characters" });
          onItemClick?.();
        }}
      />
      <NavButton
        icon={<UsersIcon className="w-5 h-5" />}
        label="Personas"
        active={pathname === "/personas" || pathname.startsWith("/personas/")}
        onClick={() => {
          void navigate({ to: "/personas" });
          onItemClick?.();
        }}
      />
      <NavButton
        icon={<GlobeIcon className="w-5 h-5" />}
        label="Settings"
        active={pathname === "/settings" || pathname.startsWith("/settings/")}
        onClick={() => {
          void navigate({ to: "/settings" });
          onItemClick?.();
        }}
      />
      <NavButton
        icon={<MapPinIcon className="w-5 h-5" />}
        label="Locations"
        active={pathname === "/locations" || pathname.startsWith("/locations/")}
        onClick={() => {
          void navigate({ to: "/locations" });
          onItemClick?.();
        }}
      />
      <NavButton
        icon={<TagIcon className="w-5 h-5" />}
        label="Tags"
        active={pathname === "/tags" || pathname.startsWith("/tags/")}
        onClick={() => {
          void navigate({ to: "/tags" });
          onItemClick?.();
        }}
      />
      <NavButton
        icon={<BoxIcon className="w-5 h-5" />}
        label="Items"
        active={pathname === "/items" || pathname.startsWith("/items/")}
        onClick={() => {
          void navigate({ to: "/items" });
          onItemClick?.();
        }}
      />
      <NavButton
        icon={<ChatIcon className="w-5 h-5" />}
        label="Sessions"
        active={pathname === "/sessions" || pathname.startsWith("/sessions/")}
        onClick={() => {
          void navigate({ to: "/sessions" });
          onItemClick?.();
        }}
      />
    </>
  );
};
