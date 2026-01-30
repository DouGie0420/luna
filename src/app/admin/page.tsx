import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, ShoppingBag, ClipboardList, DollarSign } from "lucide-react";

export default function AdminDashboardPage() {
    const stats = [
        { title: "Total Revenue", value: "$125,670", icon: DollarSign, change: "+12.5%" },
        { title: "Active Users", value: "3,456", icon: Users, change: "+250 this month" },
        { title: "Products Listed", value: "8,921", icon: ShoppingBag, change: "+50 today" },
        { title: "Pending Orders", value: "128", icon: ClipboardList, change: "-5 from yesterday" },
    ];

    return (
        <div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                            <stat.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-muted-foreground">{stat.change}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="mt-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Activity feed will be displayed here.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
