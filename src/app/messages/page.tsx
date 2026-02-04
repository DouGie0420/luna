'use client';

import { useState, useMemo } from 'react';
import { PageHeaderWithBackAndClose } from "@/components/page-header-with-back-and-close";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { useUser, useFirestore, useCollection } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { collection, query, limit, where } from 'firebase/firestore';

export default function MessagesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedContact, setSelectedContact] = useState<UserProfile | null>(null);

  const usersQuery = useMemo(() => {
    if (!firestore) return null;
    // Fetch some Pro users to act as contacts
    return query(collection(firestore, 'users'), where('isPro', '==', true), limit(10));
  }, [firestore]);

  const { data: contacts, loading } = useCollection<UserProfile>(usersQuery);

  const contactsWithoutCurrentUser = useMemo(() => {
    if (!contacts || !user) return [];
    return contacts.filter(c => c.uid !== user.uid);
  }, [contacts, user]);
  
  // Select first contact by default
  useState(() => {
    if (contactsWithoutCurrentUser && contactsWithoutCurrentUser.length > 0) {
      setSelectedContact(contactsWithoutCurrentUser[0]);
    }
  });

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
                        {loading ? (
                          <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : contactsWithoutCurrentUser && contactsWithoutCurrentUser.length > 0 ? (
                            contactsWithoutCurrentUser.map(contact => (
                                <div key={contact.uid} 
                                    className={`flex items-center gap-4 p-4 cursor-pointer ${selectedContact?.uid === contact.uid ? 'bg-accent' : 'hover:bg-accent/50'}`}
                                    onClick={() => setSelectedContact(contact)}
                                >
                                    <Avatar className="relative h-12 w-12">
                                        <AvatarImage src={contact.photoURL} alt={contact.displayName} />
                                        <AvatarFallback>{contact.displayName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-grow overflow-hidden">
                                        <p className="font-semibold truncate">{contact.displayName}</p>
                                        <p className="text-sm text-muted-foreground truncate">Click to chat...</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                          <p className="p-4 text-center text-muted-foreground">No contacts found.</p>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Chat Window */}
            <Card className="md:col-span-2 lg:col-span-3 flex flex-col">
                {selectedContact ? (
                  <>
                    <CardHeader className="flex flex-row items-center gap-4 border-b">
                        <Avatar>
                            <AvatarImage src={selectedContact.photoURL} alt={selectedContact.displayName} />
                            <AvatarFallback>{selectedContact.displayName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <h2 className="text-lg font-semibold">{selectedContact.displayName}</h2>
                    </CardHeader>
                    <CardContent className="flex-grow p-6 flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                            <p>Real-time chat feature is in development.</p>
                            <p className="text-sm">You can start a conversation with {selectedContact.displayName}.</p>
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
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Select a contact to start chatting</p>
                  </div>
                )}
            </Card>
        </div>
      </div>
    </>
  )
}
