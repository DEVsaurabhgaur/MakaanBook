import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Calculator, Zap, HelpCircle, CheckCircle, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/app/calculator")({
  head: () => ({ meta: [{ title: "Bill Calculator — MakaanBook" }] }),
  component: BillCalculatorPage,
});

function BillCalculatorPage() {
  const { user } = Route.useRouteContext();
  const [previousReading, setPreviousReading] = useState("0");
  const [currentReading, setCurrentReading] = useState("0");
  const [unitRate, setUnitRate] = useState("8");
  const [fixedCharge, setFixedCharge] = useState("0");

  // Replaced meter
  const [isReplaced, setIsReplaced] = useState(false);
  const [oldFinal, setOldFinal] = useState("");
  const [newStart, setNewStart] = useState("");

  useEffect(() => {
    // Attempt to pre-fill from active tenant's latest bill
    supabase
      .from("tenants")
      .select("id, room_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data: tenant }) => {
        if (tenant && tenant.room_id) {
          // fetch room rate and last reading
          supabase
            .from("rooms")
            .select("house_id")
            .eq("id", tenant.room_id)
            .single()
            .then(({ data: room }) => {
              if (room) {
                supabase
                  .from("houses")
                  .select("default_unit_rate")
                  .eq("id", room.house_id)
                  .single()
                  .then(({ data: house }) => {
                    if (house) setUnitRate(house.default_unit_rate?.toString() || "8");
                  });
              }
            });

          supabase
            .from("electricity_bills")
            .select("current_reading")
            .eq("room_id", tenant.room_id)
            .order("year", { ascending: false })
            .order("month", { ascending: false })
            .limit(1)
            .maybeSingle()
            .then(({ data }) => {
              if (data) setPreviousReading(data.current_reading.toString());
            });
        }
      });
  }, [user.id]);

  const prev = parseFloat(previousReading) || 0;
  const curr = parseFloat(currentReading) || 0;
  const rate = parseFloat(unitRate) || 0;
  const fixed = parseFloat(fixedCharge) || 0;

  let units = 0;
  if (isReplaced) {
    const oFinal = parseFloat(oldFinal) || 0;
    const nStart = parseFloat(newStart) || 0;
    units = (oFinal - prev) + (curr - nStart);
  } else {
    units = curr - prev;
  }
  if (units < 0) units = 0;

  const usageCost = units * rate;
  const total = usageCost + fixed;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Calculator className="h-7 w-7 text-primary" />
          Electricity Bill Calculator
        </h1>
        <p className="text-muted-foreground text-sm">Verify your landlord's billing splits by auditing consumption units.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-7 space-y-4">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Calculator Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Meter Fault check */}
              <div className="flex items-center space-x-2 py-2 border-b border-border/40">
                <Checkbox
                  id="calcMeterChange"
                  checked={isReplaced}
                  onCheckedChange={(checked: boolean) => setIsReplaced(checked)}
                />
                <Label htmlFor="calcMeterChange" className="font-semibold text-amber-400 cursor-pointer flex flex-col gap-0.5">
                  <span>Meter was replaced?</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Audit using two meter logs for the month.</span>
                </Label>
              </div>

              {isReplaced ? (
                <div className="space-y-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="calcPrev">Prev (Old Meter)</Label>
                      <Input id="calcPrev" type="number" value={previousReading} onChange={(e) => setPreviousReading(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="calcOldFinal">Old Meter Final</Label>
                      <Input id="calcOldFinal" type="number" value={oldFinal} onChange={(e) => setOldFinal(e.target.value)} placeholder="Final reading" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="calcNewStart">New Meter Start</Label>
                      <Input id="calcNewStart" type="number" value={newStart} onChange={(e) => setNewStart(e.target.value)} placeholder="0" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="calcCurr">Current (New Meter)</Label>
                      <Input id="calcCurr" type="number" value={currentReading} onChange={(e) => setCurrentReading(e.target.value)} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="calcPrev">Previous Reading</Label>
                    <Input id="calcPrev" type="number" value={previousReading} onChange={(e) => setPreviousReading(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="calcCurr">Current Reading</Label>
                    <Input id="calcCurr" type="number" value={currentReading} onChange={(e) => setCurrentReading(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="calcRate">Rate (₹ / unit)</Label>
                  <Input id="calcRate" type="number" step="0.1" value={unitRate} onChange={(e) => setUnitRate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="calcFixed">Fixed Charges (₹)</Label>
                  <Input id="calcFixed" type="number" value={fixedCharge} onChange={(e) => setFixedCharge(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Preview */}
        <div className="md:col-span-5">
          <Card className="border-primary bg-primary/5 text-foreground h-full flex flex-col justify-between">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base text-primary">Calculation Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Units Consumed:</span>
                  <span className="font-bold">{units} Units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Usage Cost:</span>
                  <span>{units} x ₹{rate} = ₹{usageCost.toFixed(2)}</span>
                </div>
                {fixed > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fixed Surcharges:</span>
                    <span>₹{fixed}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-primary/20 pt-4 mt-6">
                <div className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">Total Audited Bill</div>
                <div className="text-4xl font-display font-bold text-primary mt-1">₹{total.toFixed(2)}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
