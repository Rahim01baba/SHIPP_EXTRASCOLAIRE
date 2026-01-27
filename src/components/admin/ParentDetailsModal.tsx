import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Download, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generateInvoicePDF, downloadInvoice } from '../../lib/invoiceGenerator';

interface ParentDetailsModalProps {
  parentId: string;
  onClose: () => void;
}

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  photo_url: string | null;
}

interface Enrollment {
  id: string;
  child_id: string;
  activity_id: string;
  course_amount: number;
  transport_amount: number;
  total_amount: number;
  activity: {
    name: string;
    center: {
      name: string;
    };
  };
  child: {
    first_name: string;
    last_name: string;
  };
}

interface MonthlyPayment {
  month: string;
  monthIndex: number;
  amount: number;
  paid: boolean;
  paymentId?: string;
  invoiceSent: boolean;
  invoiceId?: string;
  enrollment?: Enrollment;
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export default function ParentDetailsModal({ parentId, onClose }: ParentDetailsModalProps) {
  const [parent, setParent] = useState<any>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [monthlyPayments, setMonthlyPayments] = useState<MonthlyPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadParentDetails();
  }, [parentId]);

  useEffect(() => {
    if (selectedChild) {
      loadChildPayments(selectedChild);
    }
  }, [selectedChild]);

  const loadParentDetails = async () => {
    setLoading(true);

    const { data: parentData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', parentId)
      .single();

    const { data: childrenData } = await supabase
      .from('children')
      .select('*')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: false });

    if (parentData) setParent(parentData);
    if (childrenData && childrenData.length > 0) {
      setChildren(childrenData);
      setSelectedChild(childrenData[0].id);
    }

    setLoading(false);
  };

  const loadChildPayments = async (childId: string) => {
    const { data: enrollmentsData } = await supabase
      .from('enrollments')
      .select(`
        *,
        activity:activities(
          name,
          center:centers(name)
        ),
        child:children(first_name, last_name)
      `)
      .eq('child_id', childId)
      .eq('status', 'active');

    if (!enrollmentsData || enrollmentsData.length === 0) {
      setMonthlyPayments([]);
      return;
    }

    setEnrollments(enrollmentsData as any);
    const enrollment = enrollmentsData[0];

    const currentYear = new Date().getFullYear();
    const monthlyData: MonthlyPayment[] = await Promise.all(
      MONTHS.map(async (month, index) => {
        const monthDate = new Date(currentYear, index, 1).toISOString().split('T')[0];

        const { data: payment } = await supabase
          .from('payments')
          .select('id, status, validated_at')
          .eq('enrollment_id', enrollment.id)
          .eq('payment_month', monthDate)
          .maybeSingle();

        const { data: invoice } = await supabase
          .from('invoices')
          .select('id, invoice_sent')
          .eq('enrollment_id', enrollment.id)
          .eq('invoice_date', monthDate)
          .maybeSingle();

        return {
          month,
          monthIndex: index,
          amount: enrollment.total_amount,
          paid: payment?.status === 'completed',
          paymentId: payment?.id,
          invoiceSent: invoice?.invoice_sent || false,
          invoiceId: invoice?.id,
          enrollment: enrollment as any,
        };
      })
    );

    setMonthlyPayments(monthlyData);
  };

  const validatePayment = async (monthData: MonthlyPayment) => {
    if (!selectedChild || !parent) return;

    setProcessing(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const enrollment = monthlyData.enrollment;
      if (!enrollment) return;

      const monthDate = new Date(new Date().getFullYear(), monthData.monthIndex, 1).toISOString().split('T')[0];

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          enrollment_id: enrollment.id,
          parent_id: parentId,
          amount: monthData.amount,
          payment_method: 'cash',
          payment_reference: `PAY-${Date.now()}`,
          status: 'completed',
          paid_at: new Date().toISOString(),
          validated_by: userData.user.id,
          validated_at: new Date().toISOString(),
          payment_month: monthDate,
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Erreur création paiement:', paymentError);
        alert('Erreur lors de la validation du paiement');
        return;
      }

      const invoiceNumber = `INV-${Date.now()}`;
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          payment_id: payment.id,
          enrollment_id: enrollment.id,
          parent_id: parentId,
          invoice_number: invoiceNumber,
          invoice_date: monthDate,
          child_name: `${enrollment.child.first_name} ${enrollment.child.last_name}`,
          activity_name: enrollment.activity.name,
          center_name: enrollment.activity.center.name,
          course_price: enrollment.course_amount,
          transport_price: enrollment.transport_amount,
          total_amount: monthData.amount,
          invoice_sent: false,
        })
        .select()
        .single();

      if (invoiceError) {
        console.error('Erreur création facture:', invoiceError);
      }

      const pdf = generateInvoicePDF({
        invoiceNumber,
        invoiceDate: new Date().toLocaleDateString('fr-FR'),
        month: monthData.month,
        parentName: parent.full_name,
        parentEmail: parent.email,
        childName: `${enrollment.child.first_name} ${enrollment.child.last_name}`,
        centerName: enrollment.activity.center.name,
        activityName: enrollment.activity.name,
        coursePrice: enrollment.course_amount,
        transportPrice: enrollment.transport_amount,
        totalAmount: monthData.amount,
      });

      downloadInvoice(pdf, `facture_${invoiceNumber}.pdf`);

      await loadChildPayments(selectedChild);
    } catch (error) {
      console.error('Erreur validation paiement:', error);
      alert('Une erreur est survenue');
    } finally {
      setProcessing(false);
    }
  };

  const markInvoiceSent = async (monthData: MonthlyPayment) => {
    if (!monthData.invoiceId) return;

    setProcessing(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { error } = await supabase
        .from('invoices')
        .update({
          invoice_sent: true,
          sent_at: new Date().toISOString(),
          sent_by: userData.user.id,
        })
        .eq('id', monthData.invoiceId);

      if (error) {
        console.error('Erreur mise à jour facture:', error);
        alert('Erreur lors de la mise à jour');
        return;
      }

      await loadChildPayments(selectedChild);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Une erreur est survenue');
    } finally {
      setProcessing(false);
    }
  };

  const downloadExistingInvoice = async (monthData: MonthlyPayment) => {
    if (!monthData.invoiceId || !parent) return;

    const { data: invoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', monthData.invoiceId)
      .single();

    if (!invoice) return;

    const pdf = generateInvoicePDF({
      invoiceNumber: invoice.invoice_number,
      invoiceDate: new Date(invoice.invoice_date).toLocaleDateString('fr-FR'),
      month: monthData.month,
      parentName: parent.full_name,
      parentEmail: parent.email,
      childName: invoice.child_name,
      centerName: invoice.center_name,
      activityName: invoice.activity_name,
      coursePrice: invoice.course_price,
      transportPrice: invoice.transport_price,
      totalAmount: invoice.total_amount,
    });

    downloadInvoice(pdf, `facture_${invoice.invoice_number}.pdf`);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-6xl w-full my-8">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{parent?.full_name}</h2>
            <p className="text-sm text-gray-600">{parent?.email}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {children.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Aucun enfant inscrit
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sélectionner un enfant
                </label>
                <select
                  value={selectedChild}
                  onChange={(e) => setSelectedChild(e.target.value)}
                  className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                >
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.first_name} {child.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {monthlyPayments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Aucune inscription active pour cet enfant
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mois
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Montant dû
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payé
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Facture envoyée
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {monthlyPayments.map((monthData) => (
                        <tr key={monthData.month} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {monthData.month}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {monthData.amount.toLocaleString('fr-FR')} FCFA
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {monthData.paid ? (
                              <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {monthData.paid && monthData.invoiceSent ? (
                              <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                            ) : monthData.paid ? (
                              <XCircle className="w-5 h-5 text-gray-400 mx-auto" />
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center space-x-2">
                              {!monthData.paid ? (
                                <button
                                  onClick={() => validatePayment(monthData)}
                                  disabled={processing}
                                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 transition"
                                >
                                  Valider paiement
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => downloadExistingInvoice(monthData)}
                                    className="p-1 text-blue-600 hover:text-blue-800 transition"
                                    title="Télécharger la facture"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                  {!monthData.invoiceSent && (
                                    <button
                                      onClick={() => markInvoiceSent(monthData)}
                                      disabled={processing}
                                      className="p-1 text-yellow-600 hover:text-yellow-800 transition disabled:opacity-50"
                                      title="Marquer facture envoyée"
                                    >
                                      <Send className="w-4 h-4" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
