function CompletionContextCard({
  members,
  selectedCompleterId,
  onChange,
  resolveMemberLabel,
}) {
  if (members.length === 0) {
    return null
  }

  return (
    <section className="content-card completion-context">
      <div>
        <h2>Registrar completados como</h2>
        <p>
          Si alguien marca una tarea por la otra persona, puedes cambiarlo
          aquí antes de pulsar "Hecha".
        </p>
      </div>

      <label className="completion-context__field">
        Persona
        <select
          value={selectedCompleterId}
          onChange={(event) => onChange(event.target.value)}
        >
          {members.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {resolveMemberLabel(member.user_id)}
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}

export default CompletionContextCard
