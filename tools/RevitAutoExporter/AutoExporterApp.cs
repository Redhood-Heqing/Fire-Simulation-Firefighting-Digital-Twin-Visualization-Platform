using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using Autodesk.Revit.DB;
using Autodesk.Revit.UI;

namespace FireTwinRevitAutoExporter;

public class AutoExporterApp : IExternalApplication
{
    private bool _hasRun;

    public Result OnStartup(UIControlledApplication application)
    {
        application.Idling += OnIdling;
        return Result.Succeeded;
    }

    public Result OnShutdown(UIControlledApplication application)
    {
        application.Idling -= OnIdling;
        return Result.Succeeded;
    }

    private void OnIdling(object? sender, Autodesk.Revit.UI.Events.IdlingEventArgs e)
    {
        if (_hasRun || sender is not UIApplication uiApplication)
        {
            return;
        }

        _hasRun = true;
        string? modelPath = Environment.GetEnvironmentVariable("FIRE_TWIN_RVT");
        string? exportDirectory = Environment.GetEnvironmentVariable("FIRE_TWIN_EXPORT_DIR");
        string exportName = Environment.GetEnvironmentVariable("FIRE_TWIN_EXPORT_NAME") ?? "library_complex";
        string? logPath = Environment.GetEnvironmentVariable("FIRE_TWIN_EXPORT_LOG");

        try
        {
            if (string.IsNullOrWhiteSpace(modelPath) || string.IsNullOrWhiteSpace(exportDirectory))
            {
                WriteLog(logPath, "Missing FIRE_TWIN_RVT or FIRE_TWIN_EXPORT_DIR.");
                return;
            }

            if (!File.Exists(modelPath))
            {
                WriteLog(logPath, $"RVT not found: {modelPath}");
                return;
            }

            Directory.CreateDirectory(exportDirectory);
            Autodesk.Revit.ApplicationServices.Application app = uiApplication.Application;
            ModelPath revitModelPath = ModelPathUtils.ConvertUserVisiblePathToModelPath(modelPath);
            OpenOptions openOptions = new();
            Document document = app.OpenDocumentFile(revitModelPath, openOptions);
            View3D? view = new FilteredElementCollector(document)
                .OfClass(typeof(View3D))
                .Cast<View3D>()
                .FirstOrDefault(candidate => !candidate.IsTemplate && candidate.CanBePrinted);

            if (view == null)
            {
                using Transaction transaction = new(document, "Create Fire Twin Export 3D View");
                transaction.Start();
                ViewFamilyType viewFamilyType = new FilteredElementCollector(document)
                    .OfClass(typeof(ViewFamilyType))
                    .Cast<ViewFamilyType>()
                    .First(item => item.ViewFamily == ViewFamily.ThreeDimensional);
                view = View3D.CreateIsometric(document, viewFamilyType.Id);
                view.Name = "FireTwin_AutoExport_3D";
                transaction.Commit();
            }

            ViewSet viewSet = new();
            viewSet.Insert(view);

            FBXExportOptions options = new()
            {
                StopOnError = false,
                WithoutBoundaryEdges = false
            };

            document.Export(exportDirectory, exportName, viewSet, options);
            document.Close(false);
            WriteLog(logPath, $"Exported FBX: {Path.Combine(exportDirectory, exportName + ".fbx")}");

            if (Environment.GetEnvironmentVariable("FIRE_TWIN_AUTO_CLOSE") == "1")
            {
                Process.GetCurrentProcess().CloseMainWindow();
            }
        }
        catch (Exception ex)
        {
            WriteLog(logPath, ex.ToString());
        }
    }

    private static void WriteLog(string? logPath, string message)
    {
        if (string.IsNullOrWhiteSpace(logPath))
        {
            return;
        }

        Directory.CreateDirectory(Path.GetDirectoryName(logPath)!);
        File.AppendAllText(logPath, $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] {message}{Environment.NewLine}");
    }
}
