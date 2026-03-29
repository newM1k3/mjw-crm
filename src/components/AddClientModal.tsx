import React, { useState } from 'react';
import { X, User, Building, Mail, Phone, Tag } from 'lucide-react';
import TagInput from './TagInput';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddClient: (client: any) => void;
}

const AddClientModal: React.FC<AddClientModalProps> = ({ isOpen, onClose, onAddClient }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    status: 'active' as 'active' | 'inactive' | 'pending',
    tags: [] as string[],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddClient({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      company: formData.company,
      status: formData.status,
      tags: formData.tags,
      last_contact: new Date().toISOString().split('T')[0],
      starred: false,
    });
    setFormData({ name: '', email: '', phone: '', company: '', status: 'active', tags: [] });
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg md-elevation-4 w-full max-w-md overflow-hidden">
        <div className="bg-primary-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-medium text-white">Add New Client</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-blue-200 hover:text-white hover:bg-primary-600 transition-colors duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                <User className="w-3 h-3 inline mr-1.5" />
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="md-outlined-input"
                placeholder="Enter client's full name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                <Mail className="w-3 h-3 inline mr-1.5" />
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="md-outlined-input"
                placeholder="client@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  <Phone className="w-3 h-3 inline mr-1.5" />
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="md-outlined-input"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="md-outlined-input"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                <Building className="w-3 h-3 inline mr-1.5" />
                Company
              </label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                required
                className="md-outlined-input"
                placeholder="Company name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                <Tag className="w-3 h-3 inline mr-1.5" />
                Tags
              </label>
              <TagInput
                value={formData.tags}
                onChange={tags => setFormData(f => ({ ...f, tags }))}
                placeholder="Add tags..."
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-primary-700 text-white text-sm font-medium rounded hover:bg-primary-800 transition-colors duration-200 md-elevation-1"
            >
              Add Client
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddClientModal;
