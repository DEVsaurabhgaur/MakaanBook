import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, Plus, Edit2, CheckCircle2, Home, Landmark, Trash2, MapPin, IndianRupee, Zap, Save, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/app/properties")({
  head: () => ({ meta: [{ title: "Properties — MakaanBook" }] }),
  component: PropertiesPage,
});

type House = Tables<"houses">;
type Room = Tables<"rooms">;

function PropertiesPage() {
  const { user } = Route.useRouteContext();
  const [houses, setHouses] = useState<House[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [houseDialogOpen, setHouseDialogOpen] = useState(false);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Form states
  const [houseName, setHouseName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [unitRate, setUnitRate] = useState("8");

  const [roomNumber, setRoomNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [rent, setRent] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [dueDay, setDueDay] = useState("5");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user.id]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: housesData, error: housesErr } = await supabase
        .from("houses")
        .select("*")
        .eq("landlord_id", user.id)
        .order("created_at", { ascending: false });

      if (housesErr) throw housesErr;
      setHouses(housesData || []);

      if (housesData && housesData.length > 0 && !selectedHouseId) {
        setSelectedHouseId(housesData[0].id);
      }

      const { data: roomsData, error: roomsErr } = await supabase
        .from("rooms")
        .select("*")
        .eq("landlord_id", user.id)
        .order("room_number");

      if (roomsErr) throw roomsErr;
      setRooms(roomsData || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch property details");
    } finally {
      setLoading(false);
    }
  }

  const selectedHouse = houses.find((h) => h.id === selectedHouseId);
  const houseRooms = rooms.filter((r) => r.house_id === selectedHouseId);

  // House save
  async function handleSaveHouse(e: React.FormEvent) {
    e.preventDefault();
    if (!houseName) {
      toast.error("House name is required");
      return;
    }
    setSaving(true);
    try {
      if (editingHouse) {
        const { error } = await supabase
          .from("houses")
          .update({
            house_name: houseName,
            address,
            city,
            default_unit_rate: parseFloat(unitRate) || 8,
          })
          .eq("id", editingHouse.id);

        if (error) throw error;
        toast.success("House updated successfully");
      } else {
        const { error, data } = await supabase
          .from("houses")
          .insert({
            landlord_id: user.id,
            house_name: houseName,
            address,
            city,
            default_unit_rate: parseFloat(unitRate) || 8,
          })
          .select()
          .single();

        if (error) throw error;
        toast.success("House created successfully");
        if (data) setSelectedHouseId(data.id);
      }
      setHouseDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save house");
    } finally {
      setSaving(false);
    }
  }

  // Room save
  async function handleSaveRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedHouseId) {
      toast.error("Please select or add a house first");
      return;
    }
    if (!roomNumber || !rent) {
      toast.error("Room number and rent are required");
      return;
    }
    setSaving(true);
    try {
      if (editingRoom) {
        const { error } = await supabase
          .from("rooms")
          .update({
            room_number: roomNumber,
            floor,
            monthly_rent: parseFloat(rent) || 0,
            security_deposit: parseFloat(securityDeposit) || 0,
            rent_due_day: parseInt(dueDay) || 5,
          })
          .eq("id", editingRoom.id);

        if (error) throw error;
        toast.success("Room updated successfully");
      } else {
        const { error } = await supabase
          .from("rooms")
          .insert({
            house_id: selectedHouseId,
            landlord_id: user.id,
            room_number: roomNumber,
            floor,
            monthly_rent: parseFloat(rent) || 0,
            security_deposit: parseFloat(securityDeposit) || 0,
            rent_due_day: parseInt(dueDay) || 5,
            is_occupied: false,
          });

        if (error) throw error;
        toast.success("Room created successfully");
      }
      setRoomDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save room");
    } finally {
      setSaving(false);
    }
  }

  function openHouseModal(house: House | null = null) {
    setEditingHouse(house);
    setHouseName(house?.house_name || "");
    setAddress(house?.address || "");
    setCity(house?.city || "");
    setUnitRate(house?.default_unit_rate?.toString() || "8");
    setHouseDialogOpen(true);
  }

  function openRoomModal(room: Room | null = null) {
    setEditingRoom(room);
    setRoomNumber(room?.room_number || "");
    setFloor(room?.floor || "");
    setRent(room?.monthly_rent?.toString() || "");
    setSecurityDeposit(room?.security_deposit?.toString() || "");
    setDueDay(room?.rent_due_day?.toString() || "5");
    setRoomDialogOpen(true);
  }

  async function handleDeleteHouse(id: string) {
    const occupiedCount = rooms.filter((r) => r.house_id === id && r.is_occupied).length;
    if (occupiedCount > 0) {
      toast.error(`Cannot delete: ${occupiedCount} room(s) still occupied. Vacate tenants first.`);
      return;
    }
    if (!confirm("Are you sure you want to delete this house? All its rooms will be deleted too.")) return;
    try {
      const { error } = await supabase.from("houses").delete().eq("id", id);
      if (error) throw error;
      toast.success("House deleted");
      if (selectedHouseId === id) {
        setSelectedHouseId(houses.find((h) => h.id !== id)?.id || null);
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDeleteRoom(id: string) {
    if (!confirm("Are you sure you want to delete this room?")) return;
    try {
      const { error } = await supabase.from("rooms").delete().eq("id", id);
      if (error) throw error;
      toast.success("Room deleted");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Properties & Rooms</h1>
          <p className="text-muted-foreground">Manage your rental properties, units, and floor layouts.</p>
        </div>
        <Button onClick={() => openHouseModal(null)} className="sm:self-start">
          <Plus className="mr-2 h-4 w-4" /> Add House
        </Button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : houses.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold">No properties registered</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Add your first building or house to start organizing rooms and tracking tenants.
            </p>
            <Button onClick={() => openHouseModal(null)} className="mt-6">
              <Plus className="mr-2 h-4 w-4" /> Add House Now
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-12">
          {/* Left panel: Houses list */}
          <div className="md:col-span-4 space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground px-1">Buildings</h3>
            <div className="space-y-2">
              {houses.map((house) => (
                <div
                  key={house.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedHouseId(house.id)}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedHouseId(house.id)}
                  className={`flex cursor-pointer flex-col gap-1.5 rounded-xl border p-4 transition-all hover:bg-card/40 ${
                    selectedHouseId === house.id
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                      : "border-border bg-card/10"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-display font-semibold text-md text-foreground">{house.house_name}</span>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" aria-label="Edit building" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openHouseModal(house)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Delete building" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteHouse(house.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{house.address || "No Address"}, {house.city || ""}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <Zap className="h-3 w-3 text-amber-500" />
                    <span>₹{house.default_unit_rate}/unit electricity</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: Rooms in selected house */}
          <div className="md:col-span-8 space-y-4">
            {selectedHouse && (
              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div>
                    <CardTitle className="font-display text-xl">{selectedHouse.house_name} Rooms</CardTitle>
                    <CardDescription>{houseRooms.length} rooms registered in this building</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => openRoomModal(null)}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Room
                  </Button>
                </CardHeader>
                <CardContent>
                  {houseRooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-xl">
                      <Home className="h-8 w-8 text-muted-foreground" />
                      <div className="mt-2 text-sm font-semibold">No rooms added</div>
                      <p className="text-xs text-muted-foreground max-w-xs mt-1">Add room numbers/flats to manage occupancy and rent ledger.</p>
                      <Button size="sm" variant="outline" onClick={() => openRoomModal(null)} className="mt-4">
                        <Plus className="mr-1 h-3.5 w-3.5" /> Add First Room
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {houseRooms.map((room) => (
                        <div key={room.id} className="relative rounded-xl border border-border bg-card/30 p-4 hover:bg-card/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="font-display font-bold text-lg text-foreground">Room {room.room_number}</span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              room.is_occupied
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-zinc-500/10 text-zinc-400"
                            }`}>
                              {room.is_occupied ? <CheckCircle2 className="h-3 w-3" /> : null}
                              {room.is_occupied ? "Occupied" : "Vacant"}
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <div className="text-muted-foreground">Monthly Rent</div>
                              <div className="font-semibold text-foreground">₹{room.monthly_rent}</div>
                            </div>
                            {room.floor && (
                              <div>
                                <div className="text-muted-foreground">Floor</div>
                                <div className="font-semibold text-foreground">{room.floor}</div>
                              </div>
                            )}
                            <div>
                              <div className="text-muted-foreground">Due Day</div>
                              <div className="font-semibold text-foreground">{room.rent_due_day}th of month</div>
                            </div>
                            {room.security_deposit ? (
                              <div>
                                <div className="text-muted-foreground">Deposit</div>
                                <div className="font-semibold text-foreground">₹{room.security_deposit}</div>
                              </div>
                            ) : null}
                          </div>
                          <div className="mt-4 flex items-center justify-end gap-1.5 border-t border-border/40 pt-3">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openRoomModal(room)}>
                              <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10" onClick={() => handleDeleteRoom(room.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* House Dialog */}
      <Dialog open={houseDialogOpen} onOpenChange={setHouseDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSaveHouse}>
            <DialogHeader>
              <DialogTitle>{editingHouse ? "Edit Building" : "Add New Building"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="houseName">House / Building Name</Label>
                <Input
                  id="houseName"
                  value={houseName}
                  onChange={(e) => setHouseName(e.target.value)}
                  placeholder="Gokuldham Society, Block A"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Sector 12, Plot 4"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="New Delhi"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="unitRate">Electricity Rate (₹/unit)</Label>
                  <Input
                    id="unitRate"
                    type="number"
                    step="0.1"
                    value={unitRate}
                    onChange={(e) => setUnitRate(e.target.value)}
                    placeholder="8"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setHouseDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {editingHouse ? "Update" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Room Dialog */}
      <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSaveRoom}>
            <DialogHeader>
              <DialogTitle>{editingRoom ? `Edit Room ${editingRoom.room_number}` : "Add New Room"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="roomNumber">Room Number / Name</Label>
                  <Input
                    id="roomNumber"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="101, F1"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="floor">Floor</Label>
                  <Input
                    id="floor"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="1st Floor"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="rent">Monthly Rent (₹)</Label>
                  <Input
                    id="rent"
                    type="number"
                    value={rent}
                    onChange={(e) => setRent(e.target.value)}
                    placeholder="12000"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="securityDeposit">Security Deposit (₹)</Label>
                  <Input
                    id="securityDeposit"
                    type="number"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(e.target.value)}
                    placeholder="24000"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="dueDay">Rent Due Day (of month)</Label>
                <Input
                  id="dueDay"
                  type="number"
                  min="1"
                  max="28"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  placeholder="5"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRoomDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {editingRoom ? "Update" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
