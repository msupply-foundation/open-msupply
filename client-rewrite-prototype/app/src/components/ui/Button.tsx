import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/utils/classNames";
import { useRipple } from "./useRipple";
import styles from "./Button.module.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  /** Icon/label tone: brand orange (default) or action blue (footer actions). */
  color?: "orange" | "blue";
}

/*
 * Reusable action button — plain <button> + CSS, no component library. Mirrors
 * the current app's outlined ButtonWithIcon: white pill, no border, shadow[2],
 * coloured icon; fills with its colour on hover (text + icon go white); a
 * subtle ripple on click (useRipple).
 */
export const Button = ({ icon, color = "orange", children, className, type = "button", ...rest }: ButtonProps) => {
  const { onPointerDown, rippleNodes } = useRipple();

  return (
    <button
      type={type}
      className={cx(styles.button, className)}
      data-color={color}
      onPointerDown={onPointerDown}
      {...rest}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {children && <span className={styles.label}>{children}</span>}
      {rippleNodes}
    </button>
  );
};
