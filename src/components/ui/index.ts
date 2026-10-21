/**
 * Kit de UI reutilizable (sección 3: no duplicar implementaciones).
 * Todos son componentes "tontos": reciben props, no llaman APIs ni leen stores.
 */
export { Badge } from './Badge';
export type { BadgeProps, BadgeVariant } from './Badge';
export { Button } from './Button';
export type { ButtonProps, ButtonSize, ButtonVariant } from './Button';
export { Card, CardBody, CardFooter, CardHeader } from './Card';
export type { CardHeaderProps, CardProps } from './Card';
export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';
export { Icon, ICON_REGISTRY, isIconName, PICKABLE_ICONS } from './Icon';
export type { IconName, IconProps } from './Icon';
export { IconButton } from './IconButton';
export type { IconButtonProps } from './IconButton';
export { Input, Select, Textarea } from './Input';
export type { InputProps, SelectProps, TextareaProps } from './Input';
export { Modal } from './Modal';
export type { ModalProps } from './Modal';
export { Skeleton, SkeletonText } from './Skeleton';
export { Spinner } from './Spinner';
export type { SpinnerProps } from './Spinner';
export { TabPanel, Tabs } from './Tabs';
export type { TabItem, TabPanelProps, TabsProps } from './Tabs';
