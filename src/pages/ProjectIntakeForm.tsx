import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Download, Plus, Trash2, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import loadHTMLToDOCX from "@/utils/htmlToDocx";
import {
  type IntakeFormData,
  EMPTY_INTAKE_FORM,
  generateIntakeFormHtml,
} from "@/components/intake/intakeFormTemplate";

const ProjectIntakeForm = () => {
  const [formData, setFormData] = useState<IntakeFormData>({ ...EMPTY_INTAKE_FORM });
  const [isDownloading, setIsDownloading] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string | undefined>(undefined);

  // Load logo as base64 on mount for DOCX header embedding
  useEffect(() => {
    fetch("/alberta-logo.png")
      .then((res) => res.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => setLogoBase64(reader.result as string);
        reader.readAsDataURL(blob);
      })
      .catch(() => console.warn("Could not load logo for DOCX header"));
  }, []);


  // --- Field updaters ---
  const updateField = <K extends keyof IntakeFormData>(key: K, value: IntakeFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const updateKeyDate = (key: keyof IntakeFormData["keyDates"], value: string) => {
    setFormData((prev) => ({
      ...prev,
      keyDates: { ...prev.keyDates, [key]: value },
    }));
  };

  // --- Array helpers ---
  const addObjective = () => updateField("objectives", [...formData.objectives, ""]);
  const removeObjective = (i: number) =>
    updateField("objectives", formData.objectives.filter((_, idx) => idx !== i));
  const updateObjective = (i: number, val: string) => {
    const next = [...formData.objectives];
    next[i] = val;
    updateField("objectives", next);
  };

  const addContributor = () =>
    updateField("leadContributors", [...formData.leadContributors, { name: "", role: "" }]);
  const removeContributor = (i: number) =>
    updateField("leadContributors", formData.leadContributors.filter((_, idx) => idx !== i));
  const updateContributor = (i: number, key: "name" | "role", val: string) => {
    const next = [...formData.leadContributors];
    next[i] = { ...next[i], [key]: val };
    updateField("leadContributors", next);
  };

  const addEvaluationRow = () =>
    updateField("evaluationRows", [...formData.evaluationRows, { col1: "", col2: "" }]);
  const removeEvaluationRow = (i: number) =>
    updateField("evaluationRows", formData.evaluationRows.filter((_, idx) => idx !== i));
  const updateEvaluationRow = (i: number, key: "col1" | "col2", val: string) => {
    const next = [...formData.evaluationRows];
    next[i] = { ...next[i], [key]: val };
    updateField("evaluationRows", next);
  };

  // --- Download DOCX ---
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const htmlContent = generateIntakeFormHtml(formData);
      const convert = await loadHTMLToDOCX();

      // Build header HTML with logo for the converter's native header support
      const headerHtml = logoBase64
        ? `<div style="text-align: right;"><img src="${logoBase64}" width="200" height="50" /></div>`
        : `<p style="text-align: right; font-family: Calibri, sans-serif; font-size: 10pt;">Alberta Public Safety and Emergency Services</p>`;

      const docxBlob = await convert(htmlContent, headerHtml, {
        table: { row: { cantSplit: true } },
        font: "Calibri",
        fontSize: 26, // 13pt in half-points
        header: true,
        headerType: "default",
      });
      const url = URL.createObjectURL(docxBlob as Blob);
      const a = document.createElement("a");
      a.href = url;
      const fileName = formData.projectName
        ? `Intake_Form_${formData.projectName.replace(/\s+/g, "_")}.docx`
        : "Project_Intake_Form.docx";
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Intake form downloaded as DOCX");
    } catch (error) {
      console.error("Error generating DOCX:", error);
      toast.error("Failed to download document");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReset = () => {
    setFormData({ ...EMPTY_INTAKE_FORM });
    toast.success("Form reset");
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold">Project Intake Form</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              Clear Form
            </Button>
            <Button onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download .docx
            </Button>
          </div>
        </div>

        {/* Form Card */}
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-lg">
              Albertan Public Safety and Emergency Services — Intake Form
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Project Name */}
            <div className="space-y-2">
              <Label className="font-semibold">Project Name</Label>
              <Input
                value={formData.projectName}
                onChange={(e) => updateField("projectName", e.target.value)}
                placeholder="Enter project name"
              />
            </div>

            <Separator />

            {/* Overview / Background */}
            <div className="space-y-2">
              <Label className="font-semibold">Overview / Background</Label>
              <Textarea
                value={formData.overviewBackground}
                onChange={(e) => updateField("overviewBackground", e.target.value)}
                placeholder="Enter project overview and background"
                rows={4}
              />
            </div>

            <Separator />

            {/* Purpose / Deliverable */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">
                  Purpose / Deliverable (<em>Specific Objectives</em>)
                </Label>
                <Button variant="outline" size="sm" onClick={addObjective}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {formData.objectives.map((obj, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-muted-foreground text-sm w-4">□</span>
                  <Input
                    value={obj}
                    onChange={(e) => updateObjective(i, e.target.value)}
                    placeholder={`Objective ${i + 1}`}
                    className="flex-1"
                  />
                  {formData.objectives.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeObjective(i)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Separator />

            {/* Key Dates */}
            <div className="space-y-3">
              <Label className="font-semibold">Key Dates</Label>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="text-left p-3 font-semibold w-[22%]">Stage</th>
                      <th className="text-left p-3 font-semibold w-[56%]">Update</th>
                      <th className="text-left p-3 font-semibold w-[22%]">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="p-3 font-medium">Request Received</td>
                      <td className="p-3">
                        <Input
                          value={formData.keyDates.personRequesting}
                          onChange={(e) => updateKeyDate("personRequesting", e.target.value)}
                          placeholder="Person(s) requesting"
                          className="h-8"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          value={formData.keyDates.requestReceivedDate}
                          onChange={(e) => updateKeyDate("requestReceivedDate", e.target.value)}
                          placeholder="Date"
                          className="h-8"
                        />
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td className="p-3 font-medium">Assigned</td>
                      <td className="p-3 text-muted-foreground text-xs italic">Auto-populated</td>
                      <td className="p-3"></td>
                    </tr>
                    <tr className="border-t">
                      <td className="p-3 font-medium">Target Completion</td>
                      <td className="p-3">
                        <Input
                          value={formData.keyDates.targetEstimatedTime}
                          onChange={(e) => updateKeyDate("targetEstimatedTime", e.target.value)}
                          placeholder="Estimated time required (days or weeks)"
                          className="h-8"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          value={formData.keyDates.targetCompletionDate}
                          onChange={(e) => updateKeyDate("targetCompletionDate", e.target.value)}
                          placeholder="Date"
                          className="h-8"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <Separator />

            {/* Lead Contributors */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Lead Contributors</Label>
                <Button variant="outline" size="sm" onClick={addContributor}>
                  <Plus className="h-3 w-3 mr-1" /> Add Row
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="text-left p-3 font-semibold w-1/2">Name</th>
                      <th className="text-left p-3 font-semibold w-1/2">Role</th>
                      <th className="p-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.leadContributors.map((c, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-3">
                          <Input
                            value={c.name}
                            onChange={(e) => updateContributor(i, "name", e.target.value)}
                            placeholder="Name"
                            className="h-8"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            value={c.role}
                            onChange={(e) => updateContributor(i, "role", e.target.value)}
                            placeholder="Role"
                            className="h-8"
                          />
                        </td>
                        <td className="p-3">
                          {formData.leadContributors.length > 1 && (
                            <Button variant="ghost" size="sm" onClick={() => removeContributor(i)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Separator />

            {/* Dependencies / Considerations */}
            <div className="space-y-3">
              <Label className="font-semibold">Dependencies / Considerations (if applicable)</Label>
              <p className="text-sm text-muted-foreground italic">
                List any barriers, competing priorities, or required decisions.
              </p>
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <span className="text-muted-foreground text-sm w-4">□</span>
                  <Label className="text-sm w-28 shrink-0">Planner Bucket:</Label>
                  <Input
                    value={formData.plannerBucket}
                    onChange={(e) => updateField("plannerBucket", e.target.value)}
                    placeholder="Enter planner bucket"
                    className="flex-1"
                  />
                </div>
                <div className="flex gap-2 items-start">
                  <span className="text-muted-foreground text-sm w-4 mt-2">□</span>
                  <Textarea
                    value={formData.dependenciesText}
                    onChange={(e) => updateField("dependenciesText", e.target.value)}
                    placeholder="Additional dependencies or considerations"
                    rows={2}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Communications Plan (static) */}
            <div className="space-y-3">
              <Label className="font-semibold">Communications Plan/Roll-Out</Label>
              <div className="bg-muted/30 rounded-lg p-4 text-sm space-y-2">
                <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                  PPDU Change Management & Communications Process
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                  <li><strong>Early Engagement</strong> – Involve staff in the drafting of new policies or initiatives through toolkits, focus groups, or project teams.</li>
                  <li><strong>Director Feedback</strong> – Present proposed changes at Decisions and More meetings for Director-level input.</li>
                  <li><strong>Manager Feedback</strong> – Share updates at Leadership Exchange meetings to gather feedback from Managers.</li>
                  <li><strong>Supervisor/Coach Feedback</strong> – Communicate changes at Provincial Coaching Calls to engage Supervisors and Peer Coaches.</li>
                  <li><strong>Formal Publication</strong> – Issue finalized changes through memos and/or highlight them during <strong>Policy Week</strong> (three times annually).</li>
                  <li><strong>Staff Engagement</strong> – Host <strong>Town Halls</strong> to inform all CCB staff, ensuring recordings are available on SharePoint for later access.</li>
                  <li><strong>Deeper Dialogue</strong> – Provide <strong>virtual open houses</strong> for Leadership and staff on key topics to allow time for discussion, reflection, and addressing emerging questions.</li>
                </ol>
              </div>
            </div>

            <Separator />

            {/* Evaluation/Monitor & Control */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Evaluation/Monitor & Control</Label>
                <Button variant="outline" size="sm" onClick={addEvaluationRow}>
                  <Plus className="h-3 w-3 mr-1" /> Add Row
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {formData.evaluationRows.map((r, i) => (
                      <tr key={i} className="border-t first:border-t-0">
                        <td className="p-3 w-1/2">
                          <Input
                            value={r.col1}
                            onChange={(e) => updateEvaluationRow(i, "col1", e.target.value)}
                            placeholder="Enter text"
                            className="h-8"
                          />
                        </td>
                        <td className="p-3 w-1/2">
                          <Input
                            value={r.col2}
                            onChange={(e) => updateEvaluationRow(i, "col2", e.target.value)}
                            placeholder="Enter text"
                            className="h-8"
                          />
                        </td>
                        <td className="p-3 w-10">
                          {formData.evaluationRows.length > 1 && (
                            <Button variant="ghost" size="sm" onClick={() => removeEvaluationRow(i)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProjectIntakeForm;
