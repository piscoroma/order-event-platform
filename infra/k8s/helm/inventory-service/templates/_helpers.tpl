{{/*
Return the name of the chart
*/}}
{{- define "inventory-service.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end }}


{{/*
Return the full name of the chart, possibly overridden
*/}}
{{- define "inventory-service.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{ .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Return common labels for all resources
*/}}
{{- define "inventory-service.labels" -}}
app.kubernetes.io/name: {{ include "apns-rest-api.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
{{- end }}

{{/*
Selector label (must be stable among the versions)
*/}}
{{- define "inventory-service.selectorLabels" -}}
app.kubernetes.io/name: {{ include "inventory-service.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
ServiceAccount name to use
*/}}
{{- define "inventory-service.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "inventory-service.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}

