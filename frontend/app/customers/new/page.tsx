// app/customers/new/page.tsx — creating customers happens via a modal on /customers.
import { redirect } from 'next/navigation'
export default function NewCustomerPage() {
  redirect('/customers')
}
