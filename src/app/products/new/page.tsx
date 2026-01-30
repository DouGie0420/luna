import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload } from "lucide-react"

export default function NewProductPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">List a New Item</CardTitle>
          <CardDescription>
            Fill in the details below to put your item on the market.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Item Name</Label>
              <Input id="name" placeholder="e.g. Vintage Leather Jacket" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Describe your item in detail..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="price">Price</Label>
                    <Input id="price" type="number" placeholder="100.00" />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select defaultValue="THB">
                        <SelectTrigger>
                            <SelectValue placeholder="Select a currency" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="THB">THB (Thai Baht)</SelectItem>
                            <SelectItem value="USDT">USDT (Tether)</SelectItem>
                            <SelectItem value="RMB-alipay">Alipay (RMB)</SelectItem>
                             <SelectItem value="RMB-wechat">WeChat Pay (RMB)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="accessories">Accessories</SelectItem>
                        <SelectItem value="home-goods">Home Goods</SelectItem>
                        <SelectItem value="sports-outdoors">Sports & Outdoors</SelectItem>
                        <SelectItem value="fashion">Fashion</SelectItem>
                        <SelectItem value="musical-instruments">Musical Instruments</SelectItem>
                    </SelectContent>
                </Select>
            </div>
             <div className="grid gap-2">
                <Label>Item Images</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-12 flex flex-col items-center justify-center text-center">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Drag & drop files here, or click to browse</p>
                    <Button variant="outline" className="mt-4">Select Files</Button>
                </div>
            </div>
            <div className="flex justify-end">
                <Button type="submit" size="lg">List Item</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
