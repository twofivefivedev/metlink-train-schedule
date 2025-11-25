"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "bg-white dark:bg-black text-black dark:text-white flex h-full w-full flex-col overflow-hidden border-2 border-black dark:border-white rounded-none shadow-[10px_10px_0_#000] dark:shadow-[10px_10px_0_rgba(255,255,255,0.3)]",
        className
      )}
      {...props}
    />
  )
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  commandClassName,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
  commandClassName?: string
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn(
          "overflow-hidden p-0 border-2 border-black dark:border-white rounded-none bg-white dark:bg-black shadow-[18px_18px_0_rgba(0,0,0,0.85)] dark:shadow-[18px_18px_0_rgba(255,255,255,0.25)]",
          className
        )}
        showCloseButton={showCloseButton}
      >
        <Command
          className={cn(
            "bg-white dark:bg-black text-black dark:text-white [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.3em] [&_[cmdk-group-heading]]:text-black/70 dark:[&_[cmdk-group-heading]]:text-white/70 [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group]]:px-0 [&_[cmdk-group]]:py-0 [&_[cmdk-input-wrapper]]:border-b-2 [&_[cmdk-input-wrapper]]:border-black dark:[&_[cmdk-input-wrapper]]:border-white [&_[cmdk-input-wrapper]]:px-4 [&_[cmdk-input-wrapper]]:bg-white dark:[&_[cmdk-input-wrapper]]:bg-black [&_[cmdk-input]]:text-black dark:[&_[cmdk-input]]:text-white [&_[cmdk-input]]:uppercase [&_[cmdk-input]]:tracking-[0.2em] [&_[cmdk-item]]:px-4 [&_[cmdk-item]]:py-4 [&_[cmdk-item]]:uppercase [&_[cmdk-item]]:tracking-[0.2em] [&_[cmdk-item]]:text-black dark:[&_[cmdk-item]]:text-white",
            commandClassName
          )}
        >
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="flex h-12 items-center gap-2 border-b-2 border-black dark:border-white bg-white dark:bg-black px-4"
    >
      <SearchIcon className="size-4 shrink-0 text-black/60 dark:text-white/70" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          "placeholder:text-black/60 dark:placeholder:text-white/60 flex h-10 w-full rounded-none bg-transparent text-xs font-semibold uppercase tracking-[0.2em] outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "max-h-[320px] scroll-py-1 overflow-x-hidden overflow-y-auto bg-white dark:bg-black text-black dark:text-white",
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className="py-6 text-center text-sm"
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "text-foreground overflow-hidden [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.3em]",
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("bg-border -mx-1 h-px", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-3 border-b border-black/15 dark:border-white/15 px-4 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-black dark:text-white outline-hidden transition-colors data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-black/10 dark:data-[selected=true]:bg-white/10 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-black/50 dark:[&_svg:not([class*='text-'])]:text-white/70",
        className
      )}
      {...props}
    />
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "text-muted-foreground ml-auto text-xs tracking-widest",
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
