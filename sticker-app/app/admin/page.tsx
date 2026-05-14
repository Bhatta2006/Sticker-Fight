import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Images, CheckCircle2, Users, Clock, TrendingUp } from "lucide-react";

const rarityVariant = (r: string) => {
  if (r === "legendary")
    return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  if (r === "rare")
    return "bg-purple-500/15 text-purple-400 border-purple-500/30";
  if (r === "uncommon")
    return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  return "bg-muted text-muted-foreground border-border";
};

export default async function AdminDashboard() {
  const session = await auth();

  const [stickerCount, userCount, liveCount] = await Promise.all([
    prisma.sticker.count(),
    prisma.user.count(),
    prisma.sticker.count({ where: { isLive: true } }),
  ]);

  const recentStickers = await prisma.sticker.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      isLive: true,
      rarity: true,
      createdAt: true,
    },
  });

  const stats = [
    {
      label: "Total Stickers",
      value: stickerCount,
      icon: Images,
      color: "text-primary",
    },
    {
      label: "Live",
      value: liveCount,
      icon: CheckCircle2,
      color: "text-emerald-400",
    },
    { label: "Users", value: userCount, icon: Users, color: "text-violet-400" },
    {
      label: "Pending Review",
      value: stickerCount - liveCount,
      icon: Clock,
      color: "text-amber-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome back, {session?.user?.name?.split(" ")[0] ?? "Admin"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          Live data
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent stickers */}
      <Card>
        <CardHeader className="px-5 py-4 border-b border-border">
          <CardTitle className="text-sm font-medium">Recent Stickers</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Rarity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentStickers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-10"
                >
                  No stickers yet — upload some from the Stickers page.
                </TableCell>
              </TableRow>
            ) : (
              recentStickers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.category}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${rarityVariant(s.rarity)}`}
                    >
                      {s.rarity}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={s.isLive ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {s.isLive ? "Live" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
