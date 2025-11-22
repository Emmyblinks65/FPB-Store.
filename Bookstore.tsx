import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Book } from './types';
import BookCard from './components/BookCard';
import ChatInput from './components/ChatInput';
import LoadingSpinner from './components/LoadingSpinner';
import BookModal from './components/BookModal';
import CartPage from './components/CartPage';
import CheckoutPage from './components/CheckoutPage';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import AdminNotificationPanel from './components/AdminNotificationPanel';
import { streamBookRecommendations } from './services/geminiService';
import { prebuiltBooks } from './data/prebuiltBooks';

const SYSTEM_INSTRUCTION = `You are a helpful assistant for a bookstore. Your task is to recommend educational books based on the user's request. For each book, provide a title, author, a compelling one-paragraph summary, a relevant category (e.g., 'Science', 'Computer Science', 'History'), the publication year, and the number of pages. Present the output as a JSON array of book objects. Do not include any introductory text or markdown formatting.`;

type CartItem = Book & { quantity: number };
export interface Notification {
  id: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

const Bookstore: React.FC = () => {
  const [displayedBooks, setDisplayedBooks] = useState<Book[]>(prebuiltBooks);
  const [inventory, setInventory] = useState<Book[]>(prebuiltBooks);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [currentView, setCurrentView] = useState<'store' | 'cart' | 'checkout' | 'login' | 'admin'>('store');
  const [isAdmin, setIsAdmin] = useState(false);
  const [salesData, setSalesData] = useState<{ bookId: string; timestamp: Date }[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (message: string) => {
    const newNotification: Notification = {
      id: uuidv4(),
      message,
      timestamp: new Date(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev.slice(0, 19)]); // Keep max 20 notifications
  };

  const handleSearch = async (prompt: string) => {
    setIsLoading(true);
    setDisplayedBooks([]);
    const newBooks: Book[] = [];
    try {
      await streamBookRecommendations(
        prompt,
        (bookData) => {
          const newId = uuidv4();
          const newBook: Book = {
            ...bookData,
            id: newId,
            price: `₦${(Math.floor(Math.random() * (40 - 15 + 1)) + 15) * 1000}`,
            coverImageUrl: `https://picsum.photos/seed/${newId}/600/800`,
            rating: +(Math.random() * (5 - 3.5) + 3.5).toFixed(1),
            reviews: [],
            isBestseller: Math.random() < 0.2,
          };
          newBooks.push(newBook);
          setDisplayedBooks([...newBooks]);
        },
        SYSTEM_INSTRUCTION
      );
      setInventory(prev => [...prev, ...newBooks.filter(nb => !prev.some(ib => ib.id === nb.id))]);
    } catch (error) {
      console.error(error);
      setDisplayedBooks(prebuiltBooks);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
  };

  const handleCloseModal = () => {
    setSelectedBook(null);
  };

  const handleAddToCart = (bookToAdd: Book) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === bookToAdd.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === bookToAdd.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      addNotification(`"${bookToAdd.title}" added to cart.`);
      return [...prevCart, { ...bookToAdd, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (bookToRemove: Book) => {
    setCart(prevCart => prevCart.filter(book => book.id !== bookToRemove.id));
  };
  
  const handleIncreaseQuantity = (bookId: string) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === bookId ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  const handleDecreaseQuantity = (bookId: string) => {
    setCart(prevCart => {
      const itemToDecrease = prevCart.find(item => item.id === bookId);
      if (itemToDecrease && itemToDecrease.quantity > 1) {
        return prevCart.map(item =>
          item.id === bookId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prevCart.filter(item => item.id !== bookId);
    });
  };
  
  const handleProceedToCheckout = () => {
    setCurrentView('checkout');
  };

  const handleConfirmCartPurchase = () => {
    const newSales: { bookId: string; timestamp: Date }[] = [];
    cart.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        newSales.push({ bookId: item.id, timestamp: new Date() });
      }
      addNotification(`New Sale: "${item.title}" (x${item.quantity})`);
    });
    setSalesData(prevSales => [...prevSales, ...newSales]);
    setCart([]);
    setCurrentView('store');
  };

  const handleBackToStore = () => {
    setCurrentView('store');
  };
  
  const handleLoginSuccess = () => {
      setIsAdmin(true);
      setCurrentView('admin');
  };
  
  const handleDismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  const totalCartItems = cart.reduce((total, item) => total + item.quantity, 0);

  if (currentView === 'login') {
      return <LoginPage onLoginSuccess={handleLoginSuccess} onClose={() => setCurrentView('store')} />
  }

  if (currentView === 'admin') {
      return <AdminDashboard onLogout={() => { setIsAdmin(false); setCurrentView('store')}} salesData={salesData} books={inventory} />
  }

  if (currentView === 'cart') {
    return <CartPage 
        cart={cart} 
        onRemoveFromCart={handleRemoveFromCart} 
        onProceedToCheckout={handleProceedToCheckout} 
        onBackToStore={handleBackToStore}
        onIncreaseQuantity={handleIncreaseQuantity}
        onDecreaseQuantity={handleDecreaseQuantity}
    />;
  }
  
  if (currentView === 'checkout') {
      return <CheckoutPage 
        cart={cart}
        onConfirmPurchase={handleConfirmCartPurchase}
        onBackToCart={() => setCurrentView('cart')}
      />
  }

  return (
    <div className="bg-slate-900 min-h-screen text-slate-100 font-sans">
      <header className="p-6 sticky top-0 bg-slate-900/80 backdrop-blur-md z-10 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold text-teal-400">FPB Store</h1>
           <div className="flex items-center gap-6">
            <button onClick={() => setCurrentView('cart')} className="relative text-slate-300 hover:text-teal-300 transition-colors" aria-label={`View shopping cart with ${totalCartItems} items`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              {totalCartItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-teal-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">{totalCartItems}</span>
              )}
            </button>
            <button 
                onClick={() => setCurrentView('login')}
                className="text-sm text-slate-400 hover:text-teal-300 transition-colors"
            >
                Admin Login
              </button>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-6">
        <div className="mb-8">
          <ChatInput onSearch={handleSearch} isLoading={isLoading} />
        </div>

        {isLoading && displayedBooks.length === 0 ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {displayedBooks.map((book) => (
              <BookCard key={book.id} book={book} onSelectBook={handleSelectBook} onAddToCart={handleAddToCart} />
            ))}
          </div>
        )}
      </main>
      
      {selectedBook && (
        <BookModal 
          book={selectedBook}
          allBooks={inventory}
          onClose={handleCloseModal}
          onAddToCart={handleAddToCart}
          onSelectBook={handleSelectBook}
        />
      )}

      {isAdmin && (
        <AdminNotificationPanel 
            notifications={notifications}
            onDismiss={handleDismissNotification}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onClearAll={handleClearAllNotifications}
        />
      )}
    </div>
  );
};

export default Bookstore;