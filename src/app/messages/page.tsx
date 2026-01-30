import { PageHeaderWithBackAndClose } from "@/components/page-header-with-back-and-close"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";

export default function MessagesPage() {
  // Placeholder data
  const contacts = [
    { id: 'user2', name: 'Billie Jean', avatarUrl: 'https://picsum.photos/seed/user2/100/100', lastMessage: 'See you then!', online: true },
    { id: 'user3', name: 'Charlie Brown', avatarUrl: 'https://picsum.photos/seed/user3/100/100', lastMessage: 'Okay, sounds good.', online: false },
    { id: 'user1', name: 'Alex Doe', avatarUrl: 'https://picsum.photos/seed/user1/100/100', lastMessage: 'Is this still available?', online: false },
  ];
  const selectedContact = contacts[0];
  const messages = [
    { from: 'other', text: 'Hey, is the Vintage Camera still available?' },
    { from: 'me', text: 'Hi! Yes, it is.' },
    { from: 'other', text: 'Great! I would like to buy it. Can we meet tomorrow?' },
    { from: 'me', text: 'Sure, tomorrow at 5pm works for me.' },
    { from: 'other', text: 'See you then!' },
  ];

  return (
    <>
      <PageHeaderWithBackAndClose />
      <div className="container mx-auto px-4 py-12">
        <div className="h-[calc(100vh-200px)] grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* Contacts List */}
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle>Chats</CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-grow">
                    <ScrollArea className="h-full">
                        {contacts.map(contact => (
                            <div key={contact.id} className={`flex items-center gap-4 p-4 cursor-pointer ${contact.id === selectedContact.id ? 'bg-accent' : 'hover:bg-accent/50'}`}>
                                <Avatar className="relative h-12 w-12">
                                    <AvatarImage src={contact.avatarUrl} alt={contact.name} />
                                    <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                                    {contact.online && <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />}
                                </Avatar>
                                <div className="flex-grow overflow-hidden">
                                    <p className="font-semibold truncate">{contact.name}</p>
                                    <p className="text-sm text-muted-foreground truncate">{contact.lastMessage}</p>
                                </div>
                            </div>
                        ))}
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Chat Window */}
            <Card className="md:col-span-2 lg:col-span-3 flex flex-col">
                <CardHeader className="flex flex-row items-center gap-4 border-b">
                     <Avatar>
                        <AvatarImage src={selectedContact.avatarUrl} alt={selectedContact.name} />
                        <AvatarFallback>{selectedContact.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h2 className="text-lg font-semibold">{selectedContact.name}</h2>
                </CardHeader>
                <CardContent className="flex-grow p-6 overflow-y-auto">
                    <div className="space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex items-end gap-2 ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                                {msg.from === 'other' && <Avatar className="h-8 w-8"><AvatarImage src={selectedContact.avatarUrl} /></Avatar>}
                                <p className={`max-w-xs lg:max-w-md p-3 rounded-lg ${msg.from === 'me' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                                    {msg.text}
                                </p>
                            </div>
                        ))}
                    </div>
                </CardContent>
                <div className="p-4 border-t">
                    <div className="relative">
                        <Input placeholder="Type a message..." className="pr-12" />
                        <Button size="icon" className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-10">
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
      </div>
    </>
  )
}
