import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ShieldOff, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20 mx-auto">
          <ShieldOff className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-5xl font-bold text-muted-foreground/40 font-mono">
          403
        </p>
        <h1 className="text-2xl font-semibold text-foreground">
          Not authorised
        </h1>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Your account does not have admin access. Contact an administrator to
          request access.
        </p>
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "outline" }), "mt-2 gap-2")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>
    </div>
  );
}
