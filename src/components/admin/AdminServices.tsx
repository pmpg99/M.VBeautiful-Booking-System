import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Settings, Plus, Pencil, Trash2, GripVertical, FolderPlus, Loader2, ListPlus, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
}

interface Service {
  id: string;
  category_id: string;
  name: string;
  price: number;
  duration_minutes: number;
  description: string | null;
  display_order: number;
  is_active: boolean;
  has_options: boolean;
}

interface ServiceOption {
  id: string;
  service_id: string;
  name: string;
  price: number;
  duration_minutes: number;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

const AdminServices = () => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Category dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", slug: "", is_active: true });
  
  // Service dialog state
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [serviceForm, setServiceForm] = useState({
    name: "",
    price: "",
    duration_minutes: "",
    description: "",
    is_active: true,
    has_options: false,
  });
  
  // Option dialog state (Level 3)
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<ServiceOption | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [optionForm, setOptionForm] = useState({
    name: "",
    price: "",
    duration_minutes: "",
    description: "",
    is_active: true,
  });
  
  // Delete confirmation state
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: "category" | "service" | "option";
    id: string;
    name: string;
  }>({ open: false, type: "category", id: "", name: "" });
  
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [catResult, svcResult, optResult] = await Promise.all([
        supabase.from("service_categories").select("*").order("display_order"),
        supabase.from("services").select("*").order("display_order"),
        supabase.from("service_options").select("*").order("display_order"),
      ]);

      if (catResult.error) throw catResult.error;
      if (svcResult.error) throw svcResult.error;
      if (optResult.error) throw optResult.error;

      setCategories(catResult.data || []);
      setServices(svcResult.data || []);
      setServiceOptions(optResult.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar serviços");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  // Category CRUD
  const openCategoryDialog = (category?: ServiceCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        slug: category.slug,
        is_active: category.is_active,
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: "", slug: "", is_active: true });
    }
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error("O nome é obrigatório");
      return;
    }

    setIsSaving(true);
    try {
      const slug = categoryForm.slug || generateSlug(categoryForm.name);
      
      if (editingCategory) {
        const { error } = await supabase
          .from("service_categories")
          .update({
            name: categoryForm.name,
            slug,
            is_active: categoryForm.is_active,
          })
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast.success("Categoria atualizada");
      } else {
        const maxOrder = Math.max(...categories.map((c) => c.display_order), 0);
        const { error } = await supabase.from("service_categories").insert({
          name: categoryForm.name,
          slug,
          is_active: categoryForm.is_active,
          display_order: maxOrder + 1,
        });

        if (error) throw error;
        toast.success("Categoria criada");
      }

      setCategoryDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error saving category:", error);
      toast.error(error.message || "Erro ao guardar categoria");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("service_categories")
        .delete()
        .eq("id", deleteDialog.id);

      if (error) throw error;
      toast.success("Categoria eliminada");
      setDeleteDialog({ open: false, type: "category", id: "", name: "" });
      fetchData();
    } catch (error: any) {
      console.error("Error deleting category:", error);
      toast.error(error.message || "Erro ao eliminar categoria");
    } finally {
      setIsSaving(false);
    }
  };

  // Service CRUD
  const openServiceDialog = (categoryId: string, service?: Service) => {
    setSelectedCategoryId(categoryId);
    if (service) {
      setEditingService(service);
      setServiceForm({
        name: service.name,
        price: service.price.toString(),
        duration_minutes: service.duration_minutes.toString(),
        description: service.description || "",
        is_active: service.is_active,
        has_options: service.has_options,
      });
    } else {
      setEditingService(null);
      setServiceForm({
        name: "",
        price: "",
        duration_minutes: "30",
        description: "",
        is_active: true,
        has_options: false,
      });
    }
    setServiceDialogOpen(true);
  };

  const handleSaveService = async () => {
    if (!serviceForm.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    // If has_options is true, price/duration can be 0 (they come from options)
    if (!serviceForm.has_options && (!serviceForm.price || !serviceForm.duration_minutes)) {
      toast.error("Preço e duração são obrigatórios quando não há opções");
      return;
    }

    const price = parseFloat(serviceForm.price) || 0;
    const duration = parseInt(serviceForm.duration_minutes) || 0;

    if (!serviceForm.has_options && (price < 0 || duration < 5)) {
      toast.error("Preço inválido ou duração mínima é 5 minutos");
      return;
    }

    setIsSaving(true);
    try {
      if (editingService) {
        const { error } = await supabase
          .from("services")
          .update({
            name: serviceForm.name,
            price,
            duration_minutes: duration || 30,
            description: serviceForm.description || null,
            is_active: serviceForm.is_active,
            has_options: serviceForm.has_options,
          })
          .eq("id", editingService.id);

        if (error) throw error;
        toast.success("Serviço atualizado");
      } else {
        const categoryServices = services.filter((s) => s.category_id === selectedCategoryId);
        const maxOrder = Math.max(...categoryServices.map((s) => s.display_order), 0);

        const { error } = await supabase.from("services").insert({
          category_id: selectedCategoryId,
          name: serviceForm.name,
          price,
          duration_minutes: duration || 30,
          description: serviceForm.description || null,
          is_active: serviceForm.is_active,
          has_options: serviceForm.has_options,
          display_order: maxOrder + 1,
        });

        if (error) throw error;
        toast.success("Serviço criado");
      }

      setServiceDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error saving service:", error);
      toast.error(error.message || "Erro ao guardar serviço");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteService = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", deleteDialog.id);

      if (error) throw error;
      toast.success("Serviço eliminado");
      setDeleteDialog({ open: false, type: "service", id: "", name: "" });
      fetchData();
    } catch (error: any) {
      console.error("Error deleting service:", error);
      toast.error(error.message || "Erro ao eliminar serviço");
    } finally {
      setIsSaving(false);
    }
  };

  // Option CRUD (Level 3)
  const openOptionDialog = (serviceId: string, option?: ServiceOption) => {
    setSelectedServiceId(serviceId);
    if (option) {
      setEditingOption(option);
      setOptionForm({
        name: option.name,
        price: option.price.toString(),
        duration_minutes: option.duration_minutes.toString(),
        description: option.description || "",
        is_active: option.is_active,
      });
    } else {
      setEditingOption(null);
      setOptionForm({
        name: "",
        price: "",
        duration_minutes: "30",
        description: "",
        is_active: true,
      });
    }
    setOptionDialogOpen(true);
  };

  const handleSaveOption = async () => {
    if (!optionForm.name.trim() || !optionForm.price || !optionForm.duration_minutes) {
      toast.error("Nome, preço e duração são obrigatórios");
      return;
    }

    const price = parseFloat(optionForm.price);
    const duration = parseInt(optionForm.duration_minutes);

    if (isNaN(price) || price < 0) {
      toast.error("Preço inválido");
      return;
    }

    if (isNaN(duration) || duration < 5) {
      toast.error("Duração mínima é 5 minutos");
      return;
    }

    setIsSaving(true);
    try {
      if (editingOption) {
        const { error } = await supabase
          .from("service_options")
          .update({
            name: optionForm.name,
            price,
            duration_minutes: duration,
            description: optionForm.description || null,
            is_active: optionForm.is_active,
          })
          .eq("id", editingOption.id);

        if (error) throw error;
        toast.success("Opção atualizada");
      } else {
        const serviceOpts = serviceOptions.filter((o) => o.service_id === selectedServiceId);
        const maxOrder = Math.max(...serviceOpts.map((o) => o.display_order), 0);

        const { error } = await supabase.from("service_options").insert({
          service_id: selectedServiceId,
          name: optionForm.name,
          price,
          duration_minutes: duration,
          description: optionForm.description || null,
          is_active: optionForm.is_active,
          display_order: maxOrder + 1,
        });

        if (error) throw error;
        toast.success("Opção criada");
      }

      setOptionDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error saving option:", error);
      toast.error(error.message || "Erro ao guardar opção");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOption = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("service_options")
        .delete()
        .eq("id", deleteDialog.id);

      if (error) throw error;
      toast.success("Opção eliminada");
      setDeleteDialog({ open: false, type: "option", id: "", name: "" });
      fetchData();
    } catch (error: any) {
      console.error("Error deleting option:", error);
      toast.error(error.message || "Erro ao eliminar opção");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${minutes}min`;
  };

  const formatPrice = (price: number) => {
    return `${price.toFixed(2)}€`;
  };

  const getServiceOptions = (serviceId: string) => {
    return serviceOptions.filter((o) => o.service_id === serviceId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Gestão de Serviços
              </CardTitle>
              <CardDescription>
                Gerir categorias, serviços e opções (3 níveis)
              </CardDescription>
            </div>
            <Button onClick={() => openCategoryDialog()} size="sm">
              <FolderPlus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma categoria de serviço criada.</p>
              <p className="text-sm mt-2">Clique em "Nova Categoria" para começar.</p>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {categories.map((category) => {
                const categoryServices = services.filter((s) => s.category_id === category.id);
                
                return (
                  <AccordionItem 
                    key={category.id} 
                    value={category.id}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 flex-1">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{category.name}</span>
                        <span className="text-sm text-muted-foreground">
                          ({categoryServices.length} serviços)
                        </span>
                        {!category.is_active && (
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                            Inativo
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-2 pb-4 space-y-3">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCategoryDialog(category)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar Categoria
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setDeleteDialog({
                                open: true,
                                type: "category",
                                id: category.id,
                                name: category.name,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openServiceDialog(category.id)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Novo Serviço
                          </Button>
                        </div>

                        {categoryServices.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            Nenhum serviço nesta categoria
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {categoryServices.map((service) => {
                              const options = getServiceOptions(service.id);
                              
                              return (
                                <div key={service.id} className="space-y-2">
                                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                                      <div>
                                        <p className="font-medium flex items-center gap-2">
                                          {service.name}
                                          {service.has_options && (
                                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                              Com opções
                                            </span>
                                          )}
                                          {!service.is_active && (
                                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                                              Inativo
                                            </span>
                                          )}
                                        </p>
                                        {!service.has_options && (
                                          <p className="text-sm text-muted-foreground">
                                            {formatPrice(service.price)} • {formatDuration(service.duration_minutes)}
                                          </p>
                                        )}
                                        {service.description && (
                                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                            {service.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex gap-1">
                                      {service.has_options && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => openOptionDialog(service.id)}
                                          title="Adicionar Opção"
                                        >
                                          <ListPlus className="h-4 w-4" />
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openServiceDialog(category.id, service)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          setDeleteDialog({
                                            open: true,
                                            type: "service",
                                            id: service.id,
                                            name: service.name,
                                          })
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  {/* Level 3: Service Options */}
                                  {service.has_options && options.length > 0 && (
                                    <div className="ml-8 space-y-1">
                                      {options.map((option) => (
                                        <div
                                          key={option.id}
                                          className="flex items-center justify-between p-2 bg-background border rounded-md"
                                        >
                                          <div className="flex items-center gap-2">
                                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                            <div>
                                              <p className="text-sm font-medium">
                                                {option.name}
                                                {!option.is_active && (
                                                  <span className="ml-2 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                                                    Inativo
                                                  </span>
                                                )}
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                {formatPrice(option.price)} • {formatDuration(option.duration_minutes)}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="flex gap-1">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7"
                                              onClick={() => openOptionDialog(service.id, option)}
                                            >
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7"
                                              onClick={() =>
                                                setDeleteDialog({
                                                  open: true,
                                                  type: "option",
                                                  id: option.id,
                                                  name: option.name,
                                                })
                                              }
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Nome *</Label>
              <Input
                id="cat-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Ex: Nail's, Pestanas, Massagem"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-slug">Slug (URL)</Label>
              <Input
                id="cat-slug"
                value={categoryForm.slug || generateSlug(categoryForm.name)}
                onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                placeholder="Auto-gerado do nome"
              />
              <p className="text-xs text-muted-foreground">
                Identificador único para URLs
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="cat-active">Categoria ativa</Label>
              <Switch
                id="cat-active"
                checked={categoryForm.is_active}
                onCheckedChange={(checked) =>
                  setCategoryForm({ ...categoryForm, is_active: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCategory} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Dialog */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Editar Serviço" : "Novo Serviço"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="svc-name">Nome do Serviço *</Label>
              <Input
                id="svc-name"
                value={serviceForm.name}
                onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                placeholder="Ex: Volume Russo, Manutenção Gel"
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <Label htmlFor="svc-has-options">Serviço com opções (Nível 3)</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Ative se o serviço tem múltiplas opções de preço/duração
                </p>
              </div>
              <Switch
                id="svc-has-options"
                checked={serviceForm.has_options}
                onCheckedChange={(checked) =>
                  setServiceForm({ ...serviceForm, has_options: checked })
                }
              />
            </div>

            {!serviceForm.has_options && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="svc-price">Preço (€) *</Label>
                  <Input
                    id="svc-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={serviceForm.price}
                    onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                    placeholder="25.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="svc-duration">Duração (min) *</Label>
                  <Input
                    id="svc-duration"
                    type="number"
                    min="5"
                    step="5"
                    value={serviceForm.duration_minutes}
                    onChange={(e) =>
                      setServiceForm({ ...serviceForm, duration_minutes: e.target.value })
                    }
                    placeholder="60"
                  />
                </div>
              </div>
            )}

            {serviceForm.has_options && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  O preço e duração serão definidos nas opções do Nível 3.
                  Após guardar, clique no ícone <ListPlus className="h-4 w-4 inline mx-1" /> para adicionar opções.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="svc-desc">Descrição (opcional)</Label>
              <Textarea
                id="svc-desc"
                value={serviceForm.description}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, description: e.target.value })
                }
                placeholder="Descrição detalhada do serviço para marketing..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Só aparece no frontend se preenchido
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="svc-active">Serviço ativo</Label>
              <Switch
                id="svc-active"
                checked={serviceForm.is_active}
                onCheckedChange={(checked) =>
                  setServiceForm({ ...serviceForm, is_active: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveService} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Option Dialog (Level 3) */}
      <Dialog open={optionDialogOpen} onOpenChange={setOptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingOption ? "Editar Opção" : "Nova Opção (Nível 3)"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="opt-name">Nome da Opção *</Label>
              <Input
                id="opt-name"
                value={optionForm.name}
                onChange={(e) => setOptionForm({ ...optionForm, name: e.target.value })}
                placeholder="Ex: 2 sem. manutenção, Pack Completo"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opt-price">Preço (€) *</Label>
                <Input
                  id="opt-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={optionForm.price}
                  onChange={(e) => setOptionForm({ ...optionForm, price: e.target.value })}
                  placeholder="35.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opt-duration">Duração (min) *</Label>
                <Input
                  id="opt-duration"
                  type="number"
                  min="5"
                  step="5"
                  value={optionForm.duration_minutes}
                  onChange={(e) =>
                    setOptionForm({ ...optionForm, duration_minutes: e.target.value })
                  }
                  placeholder="90"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="opt-desc">Descrição (opcional)</Label>
              <Textarea
                id="opt-desc"
                value={optionForm.description}
                onChange={(e) =>
                  setOptionForm({ ...optionForm, description: e.target.value })
                }
                placeholder="Descrição adicional da opção..."
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="opt-active">Opção ativa</Label>
              <Switch
                id="opt-active"
                checked={optionForm.is_active}
                onCheckedChange={(checked) =>
                  setOptionForm({ ...optionForm, is_active: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOptionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveOption} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({ ...deleteDialog, open })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminação</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.type === "category" ? (
                <>
                  Tem a certeza que deseja eliminar a categoria "{deleteDialog.name}"?
                  <br />
                  <strong>Todos os serviços e opções associados serão também eliminados.</strong>
                </>
              ) : deleteDialog.type === "service" ? (
                <>
                  Tem a certeza que deseja eliminar o serviço "{deleteDialog.name}"?
                  <br />
                  <strong>Todas as opções associadas serão também eliminadas.</strong>
                </>
              ) : (
                <>Tem a certeza que deseja eliminar a opção "{deleteDialog.name}"?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={
                deleteDialog.type === "category"
                  ? handleDeleteCategory
                  : deleteDialog.type === "service"
                  ? handleDeleteService
                  : handleDeleteOption
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminServices;
