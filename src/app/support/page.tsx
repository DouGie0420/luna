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
import { BackButton } from "@/components/back-button"

export default function SupportPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="mb-4">
          <BackButton />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-headline">Contact Support</CardTitle>
            <CardDescription>
              Have an issue? Fill out the form below and our team will get back to you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Your Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" />
              </div>
              <div className="grid gap-2">
                  <Label htmlFor="category">Inquiry Type</Label>
                  <Select>
                      <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="payment">Payment Issue</SelectItem>
                          <SelectItem value="transaction">Transaction Dispute</SelectItem>
                          <SelectItem value="account">Account Access</SelectItem>
                          <SelectItem value="bug">Report a Bug</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                  </Select>
              </div>
               <div className="grid gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" placeholder="e.g. Problem with order #ORD123" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Please describe your issue in detail..." rows={6} />
              </div>
              
              <div className="flex justify-end">
                  <Button type="submit" size="lg">Submit Ticket</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
